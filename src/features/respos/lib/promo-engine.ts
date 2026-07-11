// Pure promotion engine for ResPOS — no IO. Normalization, eligibility
// checks, and discount computation for all promo types. The IO orchestration
// (Supabase queries) lives in promotion-validator.ts.
import { z } from 'zod'
import type {
  OrderChannel,
  PromoError,
  PromotionMenuScope,
  ResPromotion,
} from '../types'

// ============ Cart shape the engine operates on ============

export interface PromoCartLine {
  itemId: string
  categoryId?: string | null
  quantity: number
  unitPrice: number
  lineTotal: number
}

export interface PromoContext {
  now: Date
  subtotal: number
  orderType: OrderChannel
  usageCount: number
  customerUsageCount: number
  hasCustomerMobile: boolean
}

// ============ Normalization (read boundary) ============

const ALL_CHANNELS: OrderChannel[] = ['dine_in', 'takeaway', 'delivery']

const scopeSchema = z.object({
  scope_id: z.coerce.number(),
  promotion_id: z.coerce.number(),
  menu_item_id: z.string().nullish(),
  menu_category_id: z.string().nullish(),
  scope_role: z.enum(['target', 'buy', 'get']).catch('target'),
})

// Supabase/PostgREST may return numeric columns as strings depending on the
// setup — every Decimal column is coerced here, once, so downstream math and
// .toFixed() calls are safe.
const promotionRowSchema = z.object({
  promotion_id: z.coerce.number(),
  code: z.string().nullable(),
  name: z.string(),
  description: z.string().nullish(),
  discount_type: z.string().nullable(),
  discount_value: z.coerce.number(),
  minimum_purchase: z.coerce.number().nullable().catch(null),
  start_date: z.string(),
  end_date: z.string(),
  usage_limit: z.coerce.number().nullish(),
  usage_per_customer: z.coerce.number().nullish(),
  is_active: z.boolean().nullable(),
  activities: z
    .array(z.enum(['dine_in', 'takeaway', 'delivery']))
    .catch(ALL_CHANNELS),
  promo_type: z
    .enum(['order_discount', 'item_discount', 'buy_x_get_y'])
    .catch('order_discount'),
  buy_quantity: z.coerce.number().nullish(),
  get_quantity: z.coerce.number().nullish(),
  get_discount_value: z.coerce.number().nullish(),
  scopes: z.array(scopeSchema).optional(),
  created_at: z.string().catch(''),
})

function normalizeDiscountType(
  raw: string | null
): ResPromotion['discount_type'] {
  if (raw === 'percent' || raw === 'percentage') return 'percentage'
  if (raw === 'amount' || raw === 'fixed') return 'fixed'
  return null
}

/**
 * Parses a raw promotions row (with optional joined scopes) into a typed
 * ResPromotion, converging the legacy discount-type vocabulary
 * ('percent'/'amount') onto 'percentage'/'fixed'.
 */
export function normalizePromotion(row: unknown): ResPromotion {
  const parsed = promotionRowSchema.parse(row)
  return {
    ...parsed,
    description: parsed.description ?? null,
    discount_type: normalizeDiscountType(parsed.discount_type),
    usage_limit: parsed.usage_limit ?? null,
    usage_per_customer: parsed.usage_per_customer ?? null,
    buy_quantity: parsed.buy_quantity ?? null,
    get_quantity: parsed.get_quantity ?? null,
    get_discount_value: parsed.get_discount_value ?? null,
    scopes: parsed.scopes,
  }
}

// ============ Eligibility ============

/**
 * Returns the first blocking error, or null when the promotion is eligible.
 * Per-customer limits are only enforceable when a mobile number is present.
 */
export function checkPromoEligibility(
  promotion: ResPromotion,
  ctx: PromoContext
): PromoError | null {
  if (!promotion.is_active) {
    return { key: 'respos.promo.error.invalid' }
  }
  if (promotion.start_date && new Date(promotion.start_date) > ctx.now) {
    return { key: 'respos.promo.error.notStarted' }
  }
  if (promotion.end_date && new Date(promotion.end_date) < ctx.now) {
    return { key: 'respos.promo.error.expired' }
  }
  if (!promotion.activities.includes(ctx.orderType)) {
    return { key: 'respos.promo.error.activityMismatch' }
  }
  if (
    promotion.minimum_purchase !== null &&
    promotion.minimum_purchase > 0 &&
    ctx.subtotal < promotion.minimum_purchase
  ) {
    return {
      key: 'respos.promo.error.minPurchase',
      params: { amount: promotion.minimum_purchase.toFixed(2) },
    }
  }
  if (
    promotion.usage_limit !== null &&
    promotion.usage_limit !== undefined &&
    ctx.usageCount >= promotion.usage_limit
  ) {
    return { key: 'respos.promo.error.usageLimitReached' }
  }
  if (
    promotion.usage_per_customer !== null &&
    promotion.usage_per_customer !== undefined &&
    ctx.hasCustomerMobile &&
    ctx.customerUsageCount >= promotion.usage_per_customer
  ) {
    return { key: 'respos.promo.error.perCustomerLimitReached' }
  }
  return null
}

// ============ Discount computation ============

function scopeMatchesLine(
  scope: PromotionMenuScope,
  line: PromoCartLine
): boolean {
  if (scope.menu_item_id) return scope.menu_item_id === line.itemId
  if (scope.menu_category_id) return scope.menu_category_id === line.categoryId
  return false
}

function linesMatchingScopes(
  lines: PromoCartLine[],
  scopes: PromotionMenuScope[]
): PromoCartLine[] {
  return lines.filter((line) =>
    scopes.some((scope) => scopeMatchesLine(scope, line))
  )
}

function computeOrderDiscount(
  promotion: ResPromotion,
  subtotal: number
): number {
  const value = Number(promotion.discount_value) || 0
  if (promotion.discount_type === 'percentage') {
    return Math.min((subtotal * value) / 100, subtotal)
  }
  return Math.min(value, subtotal)
}

function computeItemDiscount(
  promotion: ResPromotion,
  lines: PromoCartLine[]
): { discountAmount: number; error?: PromoError } {
  const targetScopes = (promotion.scopes ?? []).filter(
    (s) => s.scope_role === 'target'
  )
  const eligibleLines = linesMatchingScopes(lines, targetScopes)
  if (eligibleLines.length === 0) {
    return {
      discountAmount: 0,
      error: { key: 'respos.promo.error.notEligibleItems' },
    }
  }

  const eligibleTotal = eligibleLines.reduce((sum, l) => sum + l.lineTotal, 0)
  const value = Number(promotion.discount_value) || 0
  let discount = 0
  for (const line of eligibleLines) {
    if (promotion.discount_type === 'percentage') {
      discount += (line.lineTotal * value) / 100
    } else {
      discount += Math.min(value, line.unitPrice) * line.quantity
    }
  }
  return { discountAmount: Math.min(discount, eligibleTotal) }
}

function computeBuyXGetYDiscount(
  promotion: ResPromotion,
  lines: PromoCartLine[]
): { discountAmount: number; error?: PromoError } {
  const buyQty = promotion.buy_quantity ?? 0
  const getQty = promotion.get_quantity ?? 0
  if (buyQty < 1 || getQty < 1) {
    return {
      discountAmount: 0,
      error: { key: 'respos.promo.error.invalid' },
    }
  }

  const scopes = promotion.scopes ?? []
  const buyScopes = scopes.filter((s) => s.scope_role === 'buy')
  // An empty "get" set means get == buy (classic "buy 2 get 1 free").
  const getScopesRaw = scopes.filter((s) => s.scope_role === 'get')
  const getScopes = getScopesRaw.length > 0 ? getScopesRaw : buyScopes

  const buyLines =
    buyScopes.length > 0 ? linesMatchingScopes(lines, buyScopes) : lines
  const getLines =
    getScopes.length > 0 ? linesMatchingScopes(lines, getScopes) : lines

  const totalBuyQty = buyLines.reduce((sum, l) => sum + l.quantity, 0)
  const sets = Math.floor(totalBuyQty / buyQty)
  if (sets === 0) {
    return {
      discountAmount: 0,
      error: { key: 'respos.promo.error.notEligibleItems' },
    }
  }

  // Expand "get"-eligible lines into individual units and discount the
  // cheapest ones — the customer-favorable and industry-standard resolution.
  const units: number[] = []
  for (const line of getLines) {
    for (let i = 0; i < line.quantity; i++) {
      units.push(line.unitPrice)
    }
  }
  units.sort((a, b) => a - b)

  const discountableUnits = units.slice(0, sets * getQty)
  if (discountableUnits.length === 0) {
    return {
      discountAmount: 0,
      error: { key: 'respos.promo.error.notEligibleItems' },
    }
  }

  const pct = (promotion.get_discount_value ?? 100) / 100
  const discount = discountableUnits.reduce((sum, p) => sum + p * pct, 0)
  return { discountAmount: discount }
}

/**
 * Computes the discount for a promotion against the current cart lines.
 * Returns an unrounded amount clamped to the subtotal — rounding happens once
 * at the totals boundary (see lib/totals.ts).
 */
export function computePromoDiscount(
  promotion: ResPromotion,
  lines: PromoCartLine[],
  subtotal: number
): { discountAmount: number; error?: PromoError } {
  let result: { discountAmount: number; error?: PromoError }
  switch (promotion.promo_type) {
    case 'item_discount':
      result = computeItemDiscount(promotion, lines)
      break
    case 'buy_x_get_y':
      result = computeBuyXGetYDiscount(promotion, lines)
      break
    default:
      result = { discountAmount: computeOrderDiscount(promotion, subtotal) }
  }
  return {
    ...result,
    discountAmount: Math.max(0, Math.min(result.discountAmount, subtotal)),
  }
}

// ============ RPC error mapping ============

/**
 * Maps a record_promotion_usage() RPC failure message (CODE|detail format)
 * to a structured PromoError. Unknown messages map to a generic record error.
 */
export function mapPromoRpcError(message: string | undefined): PromoError {
  if (message?.includes('USAGE_LIMIT_REACHED')) {
    return { key: 'respos.promo.error.usageLimitReached' }
  }
  if (message?.includes('PER_CUSTOMER_LIMIT_REACHED')) {
    return { key: 'respos.promo.error.perCustomerLimitReached' }
  }
  if (message?.includes('PROMO_NOT_FOUND')) {
    return { key: 'respos.promo.error.invalid' }
  }
  return { key: 'respos.promo.error.recordFailed' }
}
