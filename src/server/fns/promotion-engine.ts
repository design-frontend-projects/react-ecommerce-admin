'use server'

import prisma from '@/lib/prisma'
import { requireTenantId } from '@/server/utils/tenant'
import { runWithTenantContext } from '@/server/context/tenant-context'
import type {
  PromotionEvaluationContext,
  PricingResult,
  DiscountItemAllocation,
  AppliedPromotionSummary,
  PromotionType,
} from '@/features/promotions/types'

// ============================================================================
// EVALUATION HELPERS (PURE FUNCTIONS)
// ============================================================================

/**
 * Checks if a specific condition evaluates to true for the given order context.
 */
export function evaluateCondition(
  condition: {
    field: string
    operator: string
    value: string
  },
  context: PromotionEvaluationContext,
  grossSubtotal: number,
  totalItemQuantity: number
): boolean {
  let contextValue: string | number | boolean = ''

  switch (condition.field) {
    case 'order_subtotal':
      contextValue = grossSubtotal
      break
    case 'item_quantity':
      contextValue = totalItemQuantity
      break
    case 'customer_group':
      contextValue = context.customerGroupId ?? ''
      break
    case 'sales_channel':
      contextValue = context.channelId ?? ''
      break
    case 'store':
      contextValue = context.storeId ?? ''
      break
    case 'branch':
      contextValue = context.branchId ?? ''
      break
    case 'customer_first_order':
      contextValue = context.isFirstOrder ?? (context.customerOrderCount === 0)
      break
    case 'customer_order_count':
      contextValue = context.customerOrderCount ?? 0
      break
    case 'day_of_week': {
      const date = context.evaluationDate ?? new Date()
      contextValue = date.getDay() // 0 = Sunday, 1 = Monday, etc.
      break
    }
    case 'time_of_day': {
      const date = context.evaluationDate ?? new Date()
      contextValue = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
      break
    }
    default:
      return true
  }

  const op = condition.operator
  const val = condition.value

  switch (op) {
    case 'eq':
      return String(contextValue).toLowerCase() === val.toLowerCase()
    case 'neq':
      return String(contextValue).toLowerCase() !== val.toLowerCase()
    case 'gte':
      return Number(contextValue) >= Number(val)
    case 'lte':
      return Number(contextValue) <= Number(val)
    case 'gt':
      return Number(contextValue) > Number(val)
    case 'lt':
      return Number(contextValue) < Number(val)
    case 'in': {
      try {
        const allowed = val.startsWith('[') ? JSON.parse(val) : val.split(',').map((s) => s.trim())
        return allowed.some((a: unknown) => String(a).toLowerCase() === String(contextValue).toLowerCase())
      } catch {
        return false
      }
    }
    case 'not_in': {
      try {
        const disallowed = val.startsWith('[') ? JSON.parse(val) : val.split(',').map((s) => s.trim())
        return !disallowed.some((a: unknown) => String(a).toLowerCase() === String(contextValue).toLowerCase())
      } catch {
        return true
      }
    }
    case 'between': {
      try {
        const parts = val.startsWith('[') ? JSON.parse(val) : val.split(',').map(Number)
        if (parts.length >= 2) {
          const num = Number(contextValue)
          return num >= parts[0] && num <= parts[1]
        }
      } catch {
        return false
      }
      return false
    }
    default:
      return true
  }
}

/**
 * Checks if a specific cart item matches the promotion product/category/brand scope.
 */
export function isItemEligible(
  item: CartItemForEvaluation,
  promotion: {
    scope_product_type: string
    products?: { product_id?: string | null; product_variant_id?: string | null; is_excluded: boolean }[]
    categories?: { category_id: string; is_excluded: boolean }[]
    brands?: { brand_id: string; is_excluded: boolean }[]
  }
): boolean {
  // Check exclusions first
  if (promotion.products && promotion.products.length > 0) {
    const isExcluded = promotion.products.some(
      (p) =>
        p.is_excluded &&
        ((p.product_id && p.product_id === item.productId) ||
          (p.product_variant_id && p.product_variant_id === item.variantId))
    )
    if (isExcluded) return false
  }

  if (item.categoryId && promotion.categories && promotion.categories.length > 0) {
    const isExcludedCat = promotion.categories.some(
      (c) => c.is_excluded && c.category_id === item.categoryId
    )
    if (isExcludedCat) return false
  }

  if (item.brandId && promotion.brands && promotion.brands.length > 0) {
    const isExcludedBrand = promotion.brands.some(
      (b) => b.is_excluded && b.brand_id === item.brandId
    )
    if (isExcludedBrand) return false
  }

  // If scope is 'all', all non-excluded items qualify
  if (promotion.scope_product_type === 'all') {
    return true
  }

  // If 'selected', item must match at least one included product, variant, category, or brand
  let included = false

  if (promotion.products && promotion.products.length > 0) {
    included = promotion.products.some(
      (p) =>
        !p.is_excluded &&
        ((p.product_id && p.product_id === item.productId) ||
          (p.product_variant_id && p.product_variant_id === item.variantId))
    )
    if (included) return true
  }

  if (item.categoryId && promotion.categories && promotion.categories.length > 0) {
    included = promotion.categories.some(
      (c) => !c.is_excluded && c.category_id === item.categoryId
    )
    if (included) return true
  }

  if (item.brandId && promotion.brands && promotion.brands.length > 0) {
    included = promotion.brands.some(
      (b) => !b.is_excluded && b.brand_id === item.brandId
    )
    if (included) return true
  }

  return included
}

// ============================================================================
// MAIN PROMOTION EVALUATION ENGINE
// ============================================================================

export async function calculateApplicableDiscounts(
  authUserId: string,
  context: PromotionEvaluationContext
): Promise<PricingResult> {
  const tenantId = await requireTenantId(authUserId)

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    const evaluationDate = context.evaluationDate ?? new Date()

    // 1. Calculate Gross Subtotal & Item Quantities
    const grossSubtotal = context.cartItems.reduce((sum, it) => sum + it.subtotal, 0)
    const totalItemQuantity = context.cartItems.reduce((sum, it) => sum + it.quantity, 0)

    // Resolve Currency
    let currencyCode = context.currencyCode ?? 'QAR'
    if (context.currencyId) {
      const cur = await prisma.currencies.findUnique({
        where: { id: context.currencyId },
        select: { code: true },
      })
      if (cur) currencyCode = cur.code
    }

    // Initialize Result Tracking
    const itemAllocations: DiscountItemAllocation[] = context.cartItems.map((item) => ({
      lineId: item.lineId,
      variantId: item.variantId,
      productId: item.productId,
      quantity: item.quantity,
      originalUnitPrice: item.unitPrice,
      finalUnitPrice: item.unitPrice,
      lineOriginalSubtotal: item.subtotal,
      totalDiscountAmount: 0,
      finalSubtotal: item.subtotal,
      discounts: [],
    }))

    const appliedPromotions: AppliedPromotionSummary[] = []
    const rejectedPromotions: { promotionId: string; name: string; reason: string }[] = []
    let appliedCoupon: PricingResult['appliedCoupon'] = null

    // 2. Coupon Validation (if coupon code provided)
    let couponPromotionId: string | null = null
    type CouponRecordType = NonNullable<Awaited<ReturnType<typeof prisma.inv_coupons.findFirst>>> & {
      promotion?: NonNullable<Awaited<ReturnType<typeof prisma.inv_promotions.findFirst>>> | null
    }
    let couponRecord: CouponRecordType | null = null

    if (context.couponCode && context.couponCode.trim()) {
      const trimmedCode = context.couponCode.trim()
      couponRecord = await prisma.inv_coupons.findFirst({
        where: {
          tenant_id: tenantId,
          code: { equals: trimmedCode, mode: 'insensitive' },
        },
        include: {
          promotion: true,
        },
      })

      if (!couponRecord) {
        rejectedPromotions.push({
          promotionId: 'coupon',
          name: trimmedCode,
          reason: 'Coupon code does not exist.',
        })
      } else if (couponRecord.status !== 'active') {
        rejectedPromotions.push({
          promotionId: couponRecord.promotion_id,
          name: couponRecord.code,
          reason: `Coupon is ${couponRecord.status}.`,
        })
      } else if (couponRecord.start_date && evaluationDate < couponRecord.start_date) {
        rejectedPromotions.push({
          promotionId: couponRecord.promotion_id,
          name: couponRecord.code,
          reason: 'Coupon promotion has not started yet.',
        })
      } else if (couponRecord.end_date && evaluationDate > couponRecord.end_date) {
        rejectedPromotions.push({
          promotionId: couponRecord.promotion_id,
          name: couponRecord.code,
          reason: 'Coupon promotion has expired.',
        })
      } else if (
        couponRecord.max_usages &&
        couponRecord.current_usages >= couponRecord.max_usages
      ) {
        rejectedPromotions.push({
          promotionId: couponRecord.promotion_id,
          name: couponRecord.code,
          reason: 'Coupon usage limit has been reached.',
        })
      } else if (couponRecord.customer_id && couponRecord.customer_id !== context.customerId) {
        rejectedPromotions.push({
          promotionId: couponRecord.promotion_id,
          name: couponRecord.code,
          reason: 'Coupon is restricted to another customer account.',
        })
      } else if (
        couponRecord.min_order_amount &&
        grossSubtotal < Number(couponRecord.min_order_amount)
      ) {
        rejectedPromotions.push({
          promotionId: couponRecord.promotion_id,
          name: couponRecord.code,
          reason: `Order minimum of ${couponRecord.min_order_amount} ${currencyCode} required for this coupon.`,
        })
      } else if (context.customerId && couponRecord.max_usages_per_customer) {
        const customerUsageCount = await prisma.inv_coupon_redemptions.count({
          where: {
            tenant_id: tenantId,
            coupon_id: couponRecord.id,
            customer_id: context.customerId,
          },
        })
        if (customerUsageCount >= couponRecord.max_usages_per_customer) {
          rejectedPromotions.push({
            promotionId: couponRecord.promotion_id,
            name: couponRecord.code,
            reason: `You have reached the maximum redemptions (${couponRecord.max_usages_per_customer}) for this coupon.`,
          })
        } else {
          couponPromotionId = couponRecord.promotion_id
        }
      } else {
        couponPromotionId = couponRecord.promotion_id
      }
    }

    // 3. Query All Active Eligible Candidate Promotions
    const candidatePromotions = await prisma.inv_promotions.findMany({
      where: {
        tenant_id: tenantId,
        status: 'active',
        start_date: { lte: evaluationDate },
        OR: [{ end_date: null }, { end_date: { gte: evaluationDate } }],
      },
      include: {
        rules: { orderBy: { sort_order: 'asc' } },
        conditions: { orderBy: { sort_order: 'asc' } },
        products: true,
        categories: true,
        brands: true,
        customer_groups: true,
        channels: true,
        stores: true,
        branches: true,
      },
      orderBy: [{ priority: 'desc' }, { created_at: 'asc' }],
    })

    // Filter candidate list: keep auto_apply promotions AND matching coupon promotion
    const applicableCandidates: typeof candidatePromotions = []

    for (const promo of candidatePromotions) {
      // If requires_coupon is true, it must match our verified coupon
      if (promo.requires_coupon) {
        if (couponPromotionId && promo.id === couponPromotionId) {
          applicableCandidates.push(promo)
        }
        continue
      }

      // Check global usage limit
      if (promo.usage_limit && promo.current_usage_count >= promo.usage_limit) {
        rejectedPromotions.push({
          promotionId: promo.id,
          name: promo.name,
          reason: 'Promotion overall usage limit reached.',
        })
        continue
      }

      // Check per-customer usage limit
      if (context.customerId && promo.usage_per_customer) {
        const customerUses = await prisma.inv_promotion_usage_logs.count({
          where: {
            tenant_id: tenantId,
            promotion_id: promo.id,
            customer_id: context.customerId,
          },
        })
        if (customerUses >= promo.usage_per_customer) {
          rejectedPromotions.push({
            promotionId: promo.id,
            name: promo.name,
            reason: `Customer usage limit (${promo.usage_per_customer}) reached.`,
          })
          continue
        }
      }

      // Check Location Scope
      if (promo.scope_location_type === 'selected') {
        const hasStoreMatch =
          context.storeId &&
          promo.stores.some((s) => !s.is_excluded && s.store_id === context.storeId)
        const hasBranchMatch =
          context.branchId &&
          promo.branches.some((b) => !b.is_excluded && b.branch_id === context.branchId)

        if (!hasStoreMatch && !hasBranchMatch) {
          rejectedPromotions.push({
            promotionId: promo.id,
            name: promo.name,
            reason: 'Not valid at this branch or store location.',
          })
          continue
        }
      }

      // Check Channel Scope
      if (promo.scope_channel_type === 'selected' && context.channelId) {
        const channelMatch = promo.channels.some(
          (c) => !c.is_excluded && c.channel_id === context.channelId
        )
        if (!channelMatch) {
          rejectedPromotions.push({
            promotionId: promo.id,
            name: promo.name,
            reason: 'Not valid for this sales channel.',
          })
          continue
        }
      }

      // Check Customer Group Scope
      if (promo.scope_customer_type === 'selected' && context.customerGroupId) {
        const groupMatch = promo.customer_groups.some(
          (g) => !g.is_excluded && g.customer_group_id === context.customerGroupId
        )
        if (!groupMatch) {
          rejectedPromotions.push({
            promotionId: promo.id,
            name: promo.name,
            reason: 'Not eligible for current customer group.',
          })
          continue
        }
      }

      // Check Min Order Amount
      if (promo.min_order_amount && grossSubtotal < Number(promo.min_order_amount)) {
        rejectedPromotions.push({
          promotionId: promo.id,
          name: promo.name,
          reason: `Order minimum of ${promo.min_order_amount} ${currencyCode} required.`,
        })
        continue
      }

      // Check Dynamic Conditions (AND across conditions)
      if (promo.conditions && promo.conditions.length > 0) {
        let conditionsPassed = true
        for (const cond of promo.conditions) {
          const pass = evaluateCondition(cond, context, grossSubtotal, totalItemQuantity)
          if (!pass) {
            conditionsPassed = false
            rejectedPromotions.push({
              promotionId: promo.id,
              name: promo.name,
              reason: `Condition failed on ${cond.field} (${cond.operator} ${cond.value}).`,
            })
            break
          }
        }
        if (!conditionsPassed) continue
      }

      applicableCandidates.push(promo)
    }

    // 4. Stacking Logic & Priority Resolution
    // Separate into stackable vs non-stackable
    let promotionsToApply: typeof applicableCandidates = []

    if (applicableCandidates.length > 0) {
      const nonStackable = applicableCandidates.filter((p) => !p.allow_stacking)
      const stackable = applicableCandidates.filter((p) => p.allow_stacking)

      if (nonStackable.length > 0) {
        // Take the highest priority non-stackable promotion
        promotionsToApply = [nonStackable[0]]
      } else {
        // Apply stackable promotions up to max stacking count
        const maxStack = Math.max(...stackable.map((p) => p.max_stacking_count ?? 1))
        promotionsToApply = stackable.slice(0, maxStack)
      }
    }

    // 5. Evaluate and Allocate Discounts
    let totalPromotionDiscount = 0
    let totalCouponDiscount = 0

    for (const promo of promotionsToApply) {
      let promoTotalDiscount = 0
      const isCouponPromo = couponRecord && promo.id === couponRecord.promotion_id

      for (const rule of promo.rules) {
        // Find matching eligible items in the cart
        const eligibleAllocations = itemAllocations.filter((alloc) => {
          const originalItem = context.cartItems.find((ci) => ci.variantId === alloc.variantId)
          if (!originalItem) return false
          return isItemEligible(originalItem, promo)
        })

        if (eligibleAllocations.length === 0 && promo.promo_type !== 'order_discount') {
          continue
        }

        const eligibleSubtotal = eligibleAllocations.reduce((s, a) => s + a.finalSubtotal, 0)
        let ruleDiscount = 0

        switch (rule.rule_type) {
          case 'percentage_discount': {
            const percent = Number(rule.discount_value)
            if (rule.apply_to === 'entire_order') {
              // Discount across all items proportional to current subtotal
              const totalRemainingSubtotal = itemAllocations.reduce((s, a) => s + a.finalSubtotal, 0)
              ruleDiscount = (percent / 100) * totalRemainingSubtotal
              if (promo.max_discount_amount && ruleDiscount > Number(promo.max_discount_amount)) {
                ruleDiscount = Number(promo.max_discount_amount)
              }

              // Allocate proportionally
              if (totalRemainingSubtotal > 0) {
                itemAllocations.forEach((alloc) => {
                  const share = (alloc.finalSubtotal / totalRemainingSubtotal) * ruleDiscount
                  const allocated = Math.min(alloc.finalSubtotal, share)
                  alloc.totalDiscountAmount += allocated
                  alloc.finalSubtotal -= allocated
                  alloc.finalUnitPrice = alloc.finalSubtotal / alloc.quantity
                  alloc.discounts.push({
                    promotionId: promo.id,
                    promotionRuleId: rule.id,
                    promotionName: promo.name,
                    couponId: isCouponPromo ? couponRecord.id : null,
                    source: isCouponPromo ? 'coupon' : 'promotion',
                    type: 'percentage',
                    rate: percent,
                    amount: allocated,
                  })
                })
              }
            } else {
              // Apply to matching items
              ruleDiscount = (percent / 100) * eligibleSubtotal
              if (promo.max_discount_amount && ruleDiscount > Number(promo.max_discount_amount)) {
                ruleDiscount = Number(promo.max_discount_amount)
              }

              if (eligibleSubtotal > 0) {
                eligibleAllocations.forEach((alloc) => {
                  const share = (alloc.finalSubtotal / eligibleSubtotal) * ruleDiscount
                  const allocated = Math.min(alloc.finalSubtotal, share)
                  alloc.totalDiscountAmount += allocated
                  alloc.finalSubtotal -= allocated
                  alloc.finalUnitPrice = alloc.finalSubtotal / alloc.quantity
                  alloc.discounts.push({
                    promotionId: promo.id,
                    promotionRuleId: rule.id,
                    promotionName: promo.name,
                    couponId: isCouponPromo ? couponRecord.id : null,
                    source: isCouponPromo ? 'coupon' : 'promotion',
                    type: 'percentage',
                    rate: percent,
                    amount: allocated,
                  })
                })
              }
            }
            break
          }

          case 'fixed_discount': {
            const fixedVal = Number(rule.discount_value)
            ruleDiscount = Math.min(eligibleSubtotal, fixedVal)
            if (promo.max_discount_amount && ruleDiscount > Number(promo.max_discount_amount)) {
              ruleDiscount = Number(promo.max_discount_amount)
            }

            if (eligibleSubtotal > 0) {
              eligibleAllocations.forEach((alloc) => {
                const share = (alloc.finalSubtotal / eligibleSubtotal) * ruleDiscount
                const allocated = Math.min(alloc.finalSubtotal, share)
                alloc.totalDiscountAmount += allocated
                alloc.finalSubtotal -= allocated
                alloc.finalUnitPrice = alloc.finalSubtotal / alloc.quantity
                alloc.discounts.push({
                  promotionId: promo.id,
                  promotionRuleId: rule.id,
                  promotionName: promo.name,
                  couponId: isCouponPromo ? couponRecord.id : null,
                  source: isCouponPromo ? 'coupon' : 'promotion',
                  type: 'fixed',
                  rate: null,
                  amount: allocated,
                })
              })
            }
            break
          }

          case 'buy_x_get_y': {
            const buyQty = rule.buy_quantity ?? 1
            const getQty = rule.get_quantity ?? 1
            const discountPct = Number(rule.get_discount_percent ?? 100)
            const bundleSize = buyQty + getQty

            // Total eligible items count
            const totalQty = eligibleAllocations.reduce((sum, a) => sum + a.quantity, 0)
            const numBundles = Math.floor(totalQty / bundleSize)

            if (numBundles > 0) {
              const freeItemsTotal = numBundles * getQty
              // Find cheapest items among eligible items to discount
              const sortedByPrice = [...eligibleAllocations].sort(
                (a, b) => a.originalUnitPrice - b.originalUnitPrice
              )

              let remainingFreeItems = freeItemsTotal
              for (const alloc of sortedByPrice) {
                if (remainingFreeItems <= 0) break
                const qtyToDiscount = Math.min(alloc.quantity, remainingFreeItems)
                const discountPerUnit = (alloc.originalUnitPrice * discountPct) / 100
                const allocDiscount = discountPerUnit * qtyToDiscount

                alloc.totalDiscountAmount += allocDiscount
                alloc.finalSubtotal -= allocDiscount
                alloc.finalUnitPrice = alloc.finalSubtotal / alloc.quantity
                alloc.discounts.push({
                  promotionId: promo.id,
                  promotionRuleId: rule.id,
                  promotionName: promo.name,
                  couponId: isCouponPromo ? couponRecord.id : null,
                  source: isCouponPromo ? 'coupon' : 'promotion',
                  type: 'percentage',
                  rate: discountPct,
                  amount: allocDiscount,
                })

                ruleDiscount += allocDiscount
                remainingFreeItems -= qtyToDiscount
              }
            }
            break
          }

          case 'free_item': {
            // Either specific variant or cheapest item gets 100% discount
            const targetAlloc = rule.get_product_variant_id
              ? eligibleAllocations.find((a) => a.variantId === rule.get_product_variant_id)
              : eligibleAllocations[0]

            if (targetAlloc && targetAlloc.finalSubtotal > 0) {
              const freeAmount = targetAlloc.originalUnitPrice
              const allocated = Math.min(targetAlloc.finalSubtotal, freeAmount)
              targetAlloc.totalDiscountAmount += allocated
              targetAlloc.finalSubtotal -= allocated
              targetAlloc.finalUnitPrice = targetAlloc.finalSubtotal / targetAlloc.quantity
              targetAlloc.discounts.push({
                promotionId: promo.id,
                promotionRuleId: rule.id,
                promotionName: promo.name,
                couponId: isCouponPromo ? couponRecord.id : null,
                source: isCouponPromo ? 'coupon' : 'promotion',
                type: 'fixed',
                rate: 100,
                amount: allocated,
              })
              ruleDiscount += allocated
            }
            break
          }
        }

        promoTotalDiscount += ruleDiscount
      }

      if (promoTotalDiscount > 0) {
        if (isCouponPromo) {
          totalCouponDiscount += promoTotalDiscount
          appliedCoupon = {
            couponId: couponRecord.id,
            code: couponRecord.code,
            promotionId: promo.id,
            discountAmount: promoTotalDiscount,
          }
        } else {
          totalPromotionDiscount += promoTotalDiscount
        }

        appliedPromotions.push({
          promotionId: promo.id,
          promotionName: promo.name,
          code: promo.code,
          promoType: promo.promo_type as PromotionType,
          discountAmount: promoTotalDiscount,
          couponCode: isCouponPromo ? couponRecord?.code ?? null : null,
        })
      }
    }

    // 6. Manual Discount & RBAC Check
    let totalManualDiscount = 0
    let approvalRequired = false
    let approvalReason: string | undefined
    let manualDiscountRequested: PricingResult['manualDiscountRequested'] = null

    if (context.manualDiscountPercent && context.manualDiscountPercent > 0) {
      const requestedPercent = Number(context.manualDiscountPercent)
      const userMaxAllowed = Number(context.userMaxDiscountPercent ?? 10) // default 10%
      const remainingSubtotal = itemAllocations.reduce((s, a) => s + a.finalSubtotal, 0)
      const requestedAmount = (requestedPercent / 100) * remainingSubtotal
      const exceedsLimit = requestedPercent > userMaxAllowed

      manualDiscountRequested = {
        percent: requestedPercent,
        amount: requestedAmount,
        userMaxAllowed,
        exceedsLimit,
      }

      if (exceedsLimit) {
        approvalRequired = true
        approvalReason = `Requested manual discount of ${requestedPercent}% exceeds authorized limit of ${userMaxAllowed}%. Requires supervisor approval.`
      } else {
        // Apply manual discount proportionally across items
        totalManualDiscount = requestedAmount
        if (remainingSubtotal > 0) {
          itemAllocations.forEach((alloc) => {
            const share = (alloc.finalSubtotal / remainingSubtotal) * requestedAmount
            const allocated = Math.min(alloc.finalSubtotal, share)
            alloc.totalDiscountAmount += allocated
            alloc.finalSubtotal -= allocated
            alloc.finalUnitPrice = alloc.finalSubtotal / alloc.quantity
            alloc.discounts.push({
              source: 'manual',
              type: 'percentage',
              rate: requestedPercent,
              amount: allocated,
            })
          })
        }
      }
    }

    // 7. Calculate Totals
    const totalItemDiscounts = itemAllocations.reduce((s, a) => s + a.totalDiscountAmount, 0)
    const totalDiscount = totalItemDiscounts
    const netAmount = Math.max(0, grossSubtotal - totalDiscount)

    return {
      currencyCode,
      grossSubtotal: Number(grossSubtotal.toFixed(4)),
      totalItemDiscounts: Number(totalItemDiscounts.toFixed(4)),
      totalInvoiceDiscounts: 0,
      totalPromotionDiscount: Number(totalPromotionDiscount.toFixed(4)),
      totalCouponDiscount: Number(totalCouponDiscount.toFixed(4)),
      totalManualDiscount: Number(totalManualDiscount.toFixed(4)),
      totalDiscount: Number(totalDiscount.toFixed(4)),
      netAmount: Number(netAmount.toFixed(4)),
      itemAllocations,
      appliedPromotions,
      appliedCoupon,
      rejectedPromotions,
      approvalRequired,
      approvalReason,
      manualDiscountRequested,
    }
  })
}
