import { describe, expect, it } from 'vitest'
import type { ResPromotion } from '../types'
import {
  checkPromoEligibility,
  computePromoDiscount,
  mapPromoRpcError,
  normalizePromotion,
  type PromoCartLine,
  type PromoContext,
} from './promo-engine'

const daysFromNow = (days: number) =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()

const basePromotion: ResPromotion = {
  promotion_id: 1,
  code: 'SAVE10',
  name: 'Save 10',
  description: null,
  discount_type: 'percentage',
  discount_value: 10,
  minimum_purchase: null,
  start_date: daysFromNow(-1),
  end_date: daysFromNow(1),
  usage_limit: null,
  usage_per_customer: null,
  is_active: true,
  activities: ['dine_in', 'takeaway', 'delivery'],
  promo_type: 'order_discount',
  created_at: new Date().toISOString(),
}

const baseContext: PromoContext = {
  now: new Date(),
  subtotal: 100,
  orderType: 'dine_in',
  usageCount: 0,
  customerUsageCount: 0,
  hasCustomerMobile: false,
}

const line = (
  itemId: string,
  unitPrice: number,
  quantity: number,
  categoryId?: string
): PromoCartLine => ({
  itemId,
  categoryId: categoryId ?? null,
  quantity,
  unitPrice,
  lineTotal: unitPrice * quantity,
})

describe('normalizePromotion', () => {
  it('converges legacy vocabulary and coerces Decimal strings', () => {
    const normalized = normalizePromotion({
      ...basePromotion,
      discount_type: 'percent',
      discount_value: '12.50',
      minimum_purchase: '100.00',
    })
    expect(normalized.discount_type).toBe('percentage')
    expect(normalized.discount_value).toBe(12.5)
    expect(normalized.minimum_purchase).toBe(100)
  })

  it('maps amount to fixed and defaults missing new columns', () => {
    const normalized = normalizePromotion({
      promotion_id: '7',
      code: 'OLD',
      name: 'Legacy',
      discount_type: 'amount',
      discount_value: 5,
      minimum_purchase: null,
      start_date: basePromotion.start_date,
      end_date: basePromotion.end_date,
      is_active: true,
    })
    expect(normalized.promotion_id).toBe(7)
    expect(normalized.discount_type).toBe('fixed')
    expect(normalized.promo_type).toBe('order_discount')
    expect(normalized.activities).toEqual(['dine_in', 'takeaway', 'delivery'])
  })
})

describe('checkPromoEligibility', () => {
  it('rejects a promo that has not started', () => {
    const error = checkPromoEligibility(
      { ...basePromotion, start_date: daysFromNow(1) },
      baseContext
    )
    expect(error?.key).toBe('respos.promo.error.notStarted')
  })

  it('rejects an expired promo', () => {
    const error = checkPromoEligibility(
      { ...basePromotion, end_date: daysFromNow(-1) },
      baseContext
    )
    expect(error?.key).toBe('respos.promo.error.expired')
  })

  it('rejects when the order channel is not in activities', () => {
    const error = checkPromoEligibility(
      { ...basePromotion, activities: ['delivery'] },
      { ...baseContext, orderType: 'dine_in' }
    )
    expect(error?.key).toBe('respos.promo.error.activityMismatch')
  })

  it('accepts a matching order channel', () => {
    const error = checkPromoEligibility(
      { ...basePromotion, activities: ['delivery'] },
      { ...baseContext, orderType: 'delivery' }
    )
    expect(error).toBeNull()
  })

  it('enforces minimum purchase at the boundary', () => {
    const promo = { ...basePromotion, minimum_purchase: 100 }
    expect(
      checkPromoEligibility(promo, { ...baseContext, subtotal: 99.99 })?.key
    ).toBe('respos.promo.error.minPurchase')
    expect(
      checkPromoEligibility(promo, { ...baseContext, subtotal: 100 })
    ).toBeNull()
  })

  it('enforces the total usage limit', () => {
    const promo = { ...basePromotion, usage_limit: 5 }
    expect(
      checkPromoEligibility(promo, { ...baseContext, usageCount: 5 })?.key
    ).toBe('respos.promo.error.usageLimitReached')
    expect(
      checkPromoEligibility(promo, { ...baseContext, usageCount: 4 })
    ).toBeNull()
  })

  it('enforces the per-customer limit only when a mobile is present', () => {
    const promo = { ...basePromotion, usage_per_customer: 1 }
    expect(
      checkPromoEligibility(promo, {
        ...baseContext,
        customerUsageCount: 1,
        hasCustomerMobile: true,
      })?.key
    ).toBe('respos.promo.error.perCustomerLimitReached')
    // No mobile → unenforceable client-side, skipped
    expect(
      checkPromoEligibility(promo, {
        ...baseContext,
        customerUsageCount: 1,
        hasCustomerMobile: false,
      })
    ).toBeNull()
  })
})

describe('computePromoDiscount — order_discount', () => {
  it('computes a percentage discount', () => {
    const { discountAmount } = computePromoDiscount(basePromotion, [], 200)
    expect(discountAmount).toBe(20)
  })

  it('clamps a fixed discount to the subtotal', () => {
    const promo: ResPromotion = {
      ...basePromotion,
      discount_type: 'fixed',
      discount_value: 50,
    }
    expect(computePromoDiscount(promo, [], 200).discountAmount).toBe(50)
    expect(computePromoDiscount(promo, [], 30).discountAmount).toBe(30)
  })
})

describe('computePromoDiscount — item_discount', () => {
  const itemPromo: ResPromotion = {
    ...basePromotion,
    promo_type: 'item_discount',
    discount_type: 'percentage',
    discount_value: 50,
    scopes: [
      {
        scope_id: 1,
        promotion_id: 1,
        menu_item_id: 'burger',
        menu_category_id: null,
        scope_role: 'target',
      },
    ],
  }

  it('discounts only lines matching a target item scope', () => {
    const lines = [line('burger', 10, 2), line('pizza', 20, 1)]
    const { discountAmount } = computePromoDiscount(itemPromo, lines, 40)
    expect(discountAmount).toBe(10) // 50% of the 20 burger total
  })

  it('matches by category scope', () => {
    const categoryPromo: ResPromotion = {
      ...itemPromo,
      scopes: [
        {
          scope_id: 2,
          promotion_id: 1,
          menu_item_id: null,
          menu_category_id: 'drinks',
          scope_role: 'target',
        },
      ],
    }
    const lines = [line('cola', 5, 2, 'drinks'), line('pizza', 20, 1, 'mains')]
    const { discountAmount } = computePromoDiscount(categoryPromo, lines, 30)
    expect(discountAmount).toBe(5)
  })

  it('returns a notEligibleItems error when nothing matches', () => {
    const lines = [line('pizza', 20, 1)]
    const { discountAmount, error } = computePromoDiscount(itemPromo, lines, 20)
    expect(discountAmount).toBe(0)
    expect(error?.key).toBe('respos.promo.error.notEligibleItems')
  })

  it('caps a fixed per-unit discount at the unit price', () => {
    const fixedPromo: ResPromotion = {
      ...itemPromo,
      discount_type: 'fixed',
      discount_value: 15,
    }
    const lines = [line('burger', 10, 2)]
    const { discountAmount } = computePromoDiscount(fixedPromo, lines, 20)
    expect(discountAmount).toBe(20) // min(15, 10) × 2, clamped to eligible total
  })
})

describe('computePromoDiscount — buy_x_get_y', () => {
  const bogoPromo: ResPromotion = {
    ...basePromotion,
    promo_type: 'buy_x_get_y',
    buy_quantity: 2,
    get_quantity: 1,
    get_discount_value: 100,
    scopes: [
      {
        scope_id: 3,
        promotion_id: 1,
        menu_item_id: 'burger',
        menu_category_id: null,
        scope_role: 'buy',
      },
    ],
  }

  it('discounts the cheapest units, one per complete set', () => {
    // 3 burgers → 1 complete "buy 2" set → 1 free (get == buy fallback)
    const lines = [line('burger', 10, 3)]
    expect(computePromoDiscount(bogoPromo, lines, 30).discountAmount).toBe(10)
  })

  it('scales sets with quantity (floor)', () => {
    const lines = [line('burger', 10, 5)]
    // floor(5/2) = 2 sets → 2 free units
    expect(computePromoDiscount(bogoPromo, lines, 50).discountAmount).toBe(20)
  })

  it('errors when there are not enough buy units', () => {
    const lines = [line('burger', 10, 1)]
    const { error } = computePromoDiscount(bogoPromo, lines, 10)
    expect(error?.key).toBe('respos.promo.error.notEligibleItems')
  })

  it('uses explicit get scopes and picks the cheapest eligible units', () => {
    const crossPromo: ResPromotion = {
      ...bogoPromo,
      scopes: [
        ...(bogoPromo.scopes ?? []),
        {
          scope_id: 4,
          promotion_id: 1,
          menu_item_id: 'cola',
          menu_category_id: null,
          scope_role: 'get',
        },
      ],
    }
    const lines = [line('burger', 10, 2), line('cola', 3, 2)]
    // 1 set → 1 free cola (cheapest get unit)
    expect(computePromoDiscount(crossPromo, lines, 26).discountAmount).toBe(3)
  })

  it('applies a partial get discount', () => {
    const halfOff: ResPromotion = { ...bogoPromo, get_discount_value: 50 }
    const lines = [line('burger', 10, 3)]
    expect(computePromoDiscount(halfOff, lines, 30).discountAmount).toBe(5)
  })

  it('applies to all lines when no buy scopes are configured', () => {
    const unscoped: ResPromotion = { ...bogoPromo, scopes: [] }
    const lines = [line('burger', 10, 1), line('pizza', 20, 1)]
    // 2 units total → 1 set → cheapest unit (10) free
    expect(computePromoDiscount(unscoped, lines, 30).discountAmount).toBe(10)
  })
})

describe('mapPromoRpcError', () => {
  it('maps RPC failure codes to i18n keys', () => {
    expect(mapPromoRpcError('USAGE_LIMIT_REACHED|1').key).toBe(
      'respos.promo.error.usageLimitReached'
    )
    expect(mapPromoRpcError('PER_CUSTOMER_LIMIT_REACHED|1').key).toBe(
      'respos.promo.error.perCustomerLimitReached'
    )
    expect(mapPromoRpcError('PROMO_NOT_FOUND|9').key).toBe(
      'respos.promo.error.invalid'
    )
    expect(mapPromoRpcError('boom').key).toBe('respos.promo.error.recordFailed')
    expect(mapPromoRpcError(undefined).key).toBe(
      'respos.promo.error.recordFailed'
    )
  })
})
