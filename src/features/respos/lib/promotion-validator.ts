// Promotion validation for ResPOS — IO orchestration over the pure engine in
// promo-engine.ts. Reads the admin `promotions` table (single source of
// truth); the legacy `res_promotions` tables are deprecated.
//
// Client-side validation is advisory UX — the record_promotion_usage() RPC
// re-checks limits atomically at order completion and is the enforcement
// point. Applying a promotion requires being online: usage limits are global
// counters and validating against a stale cache risks over-redemption.
import { supabase } from '@/lib/supabase'
import type {
  OrderChannel,
  PromoValidationResult,
  ResPromotion,
} from '../types'
import {
  checkPromoEligibility,
  computePromoDiscount,
  normalizePromotion,
  type PromoCartLine,
} from './promo-engine'

const PROMOTION_SELECT = '*, scopes:promotion_menu_scopes(*)'

export interface PromoValidationContext {
  lines: PromoCartLine[]
  subtotal: number
  orderType: OrderChannel
  customerMobile?: string
}

function isOffline(): boolean {
  // Only an explicit false counts — Node exposes a navigator without onLine.
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

async function fetchUsageCounts(
  promotionId: number,
  customerMobile?: string
): Promise<{ usageCount: number; customerUsageCount: number }> {
  const { count: usageCount, error: usageError } = await supabase
    .from('promotion_usage')
    .select('*', { count: 'exact', head: true })
    .eq('promotion_id', promotionId)

  if (usageError) throw usageError

  const mobile = customerMobile?.trim()
  if (!mobile) {
    return { usageCount: usageCount ?? 0, customerUsageCount: 0 }
  }

  const { count: customerUsageCount, error: customerError } = await supabase
    .from('promotion_usage')
    .select('*', { count: 'exact', head: true })
    .eq('promotion_id', promotionId)
    .eq('customer_mobile', mobile)

  if (customerError) throw customerError

  return {
    usageCount: usageCount ?? 0,
    customerUsageCount: customerUsageCount ?? 0,
  }
}

/**
 * Validates a promotion (already fetched) against the current cart context
 * and computes its discount. Shared by code entry and list selection.
 */
export async function validatePromotion(
  promotion: ResPromotion,
  ctx: PromoValidationContext
): Promise<PromoValidationResult> {
  if (isOffline()) {
    return {
      valid: false,
      discountAmount: 0,
      error: { key: 'respos.promo.error.offline' },
    }
  }

  const { usageCount, customerUsageCount } = await fetchUsageCounts(
    promotion.promotion_id,
    ctx.customerMobile
  )

  const eligibilityError = checkPromoEligibility(promotion, {
    now: new Date(),
    subtotal: ctx.subtotal,
    orderType: ctx.orderType,
    usageCount,
    customerUsageCount,
    hasCustomerMobile: !!ctx.customerMobile?.trim(),
  })
  if (eligibilityError) {
    return { valid: false, discountAmount: 0, error: eligibilityError }
  }

  const { discountAmount, error } = computePromoDiscount(
    promotion,
    ctx.lines,
    ctx.subtotal
  )
  if (error) {
    return { valid: false, discountAmount: 0, error }
  }

  return {
    valid: true,
    promotion,
    discountAmount: Math.round(discountAmount * 100) / 100,
  }
}

/**
 * Looks up a promo code on the `promotions` table and validates it against
 * the current cart context.
 */
export async function validatePromoCode(
  code: string,
  ctx: PromoValidationContext
): Promise<PromoValidationResult> {
  if (!code.trim()) {
    return {
      valid: false,
      discountAmount: 0,
      error: { key: 'respos.promo.error.empty' },
    }
  }

  if (isOffline()) {
    return {
      valid: false,
      discountAmount: 0,
      error: { key: 'respos.promo.error.offline' },
    }
  }

  const { data, error } = await supabase
    .from('promotions')
    .select(PROMOTION_SELECT)
    .eq('code', code.toUpperCase().trim())
    .eq('is_active', true)
    .maybeSingle()

  if (error || !data) {
    return {
      valid: false,
      discountAmount: 0,
      error: { key: 'respos.promo.error.invalid' },
    }
  }

  return validatePromotion(normalizePromotion(data), ctx)
}

/**
 * Fetches active promotions eligible for the given order channel, for the
 * POS selection list. Date window and activity are filtered server-side;
 * usage-limit checks are deferred to apply-time to avoid N count queries.
 */
export async function fetchEligiblePromotions(
  orderType: OrderChannel
): Promise<ResPromotion[]> {
  if (isOffline()) return []

  const nowIso = new Date().toISOString()
  const { data, error } = await supabase
    .from('promotions')
    .select(PROMOTION_SELECT)
    .eq('is_active', true)
    .lte('start_date', nowIso)
    .gte('end_date', nowIso)
    .contains('activities', [orderType])
    .order('name')

  if (error) throw error
  return (data ?? []).map(normalizePromotion)
}
