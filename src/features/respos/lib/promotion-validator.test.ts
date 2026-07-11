import { beforeEach, describe, expect, it, vi } from 'vitest'
import { supabase } from '@/lib/supabase'
import {
  validatePromoCode,
  type PromoValidationContext,
} from './promotion-validator'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}))

/**
 * Minimal PostgREST chain mock: every builder method returns the chain, the
 * chain itself is awaitable (for head-count queries) and exposes maybeSingle.
 */
function chain(result: unknown) {
  const obj: Record<string, unknown> = {}
  const self = () => obj
  obj.select = vi.fn(self)
  obj.eq = vi.fn(self)
  obj.lte = vi.fn(self)
  obj.gte = vi.fn(self)
  obj.contains = vi.fn(self)
  obj.order = vi.fn(self)
  obj.maybeSingle = vi.fn().mockResolvedValue(result)
  obj.then = (
    resolve: (value: unknown) => unknown,
    reject: (reason: unknown) => unknown
  ) => Promise.resolve(result).then(resolve, reject)
  return obj
}

const daysFromNow = (days: number) =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()

const promoRow = (overrides: Record<string, unknown> = {}) => ({
  promotion_id: 1,
  code: 'SAVE10',
  name: 'Save 10',
  description: null,
  discount_type: 'percent', // legacy vocabulary — must be normalized
  discount_value: 10,
  minimum_purchase: null,
  start_date: daysFromNow(-1),
  end_date: daysFromNow(1),
  usage_limit: null,
  usage_per_customer: null,
  is_active: true,
  created_at: new Date().toISOString(),
  ...overrides,
})

const ctx: PromoValidationContext = {
  lines: [],
  subtotal: 200,
  orderType: 'dine_in',
}

function mockTables({
  promotion,
  usageCount = 0,
}: {
  promotion: unknown
  usageCount?: number
}) {
  vi.mocked(supabase.from).mockImplementation(((table: string) => {
    if (table === 'promotions') {
      return chain({ data: promotion, error: null })
    }
    if (table === 'promotion_usage') {
      return chain({ count: usageCount, error: null })
    }
    throw new Error(`Unexpected table: ${table}`)
  }) as never)
}

describe('validatePromoCode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  it('returns the empty-code error key', async () => {
    const result = await validatePromoCode('', ctx)
    expect(result.valid).toBe(false)
    expect(result.error?.key).toBe('respos.promo.error.empty')
  })

  it('returns the offline error key when navigator.onLine is false', async () => {
    vi.stubGlobal('navigator', { onLine: false })
    const result = await validatePromoCode('SAVE10', ctx)
    expect(result.valid).toBe(false)
    expect(result.error?.key).toBe('respos.promo.error.offline')
  })

  it('queries the promotions table (not res_promotions) with a normalized code', async () => {
    mockTables({ promotion: promoRow() })
    await validatePromoCode('  save10 ', ctx)
    expect(vi.mocked(supabase.from)).toHaveBeenCalledWith('promotions')
    expect(vi.mocked(supabase.from)).not.toHaveBeenCalledWith('res_promotions')
  })

  it('returns invalid for a non-existent code', async () => {
    mockTables({ promotion: null })
    const result = await validatePromoCode('NOPE', ctx)
    expect(result.valid).toBe(false)
    expect(result.error?.key).toBe('respos.promo.error.invalid')
  })

  it('returns the expired key for an expired promo', async () => {
    mockTables({ promotion: promoRow({ end_date: daysFromNow(-1) }) })
    const result = await validatePromoCode('SAVE10', ctx)
    expect(result.valid).toBe(false)
    expect(result.error?.key).toBe('respos.promo.error.expired')
  })

  it('returns the notStarted key for a future promo', async () => {
    mockTables({ promotion: promoRow({ start_date: daysFromNow(1) }) })
    const result = await validatePromoCode('SAVE10', ctx)
    expect(result.error?.key).toBe('respos.promo.error.notStarted')
  })

  it('returns the usage-limit key when the total limit is exhausted', async () => {
    mockTables({
      promotion: promoRow({ usage_limit: 5 }),
      usageCount: 5,
    })
    const result = await validatePromoCode('SAVE10', ctx)
    expect(result.error?.key).toBe('respos.promo.error.usageLimitReached')
  })

  it('returns the activity-mismatch key for a scoped promo', async () => {
    mockTables({ promotion: promoRow({ activities: ['delivery'] }) })
    const result = await validatePromoCode('SAVE10', {
      ...ctx,
      orderType: 'dine_in',
    })
    expect(result.error?.key).toBe('respos.promo.error.activityMismatch')
  })

  it('returns the minPurchase key with the amount param', async () => {
    mockTables({ promotion: promoRow({ minimum_purchase: '500.00' }) })
    const result = await validatePromoCode('SAVE10', ctx)
    expect(result.error?.key).toBe('respos.promo.error.minPurchase')
    expect(result.error?.params?.amount).toBe('500.00')
  })

  it('validates a legacy percent promo and computes the discount', async () => {
    mockTables({ promotion: promoRow() })
    const result = await validatePromoCode('SAVE10', ctx)
    expect(result.valid).toBe(true)
    expect(result.discountAmount).toBe(20)
    expect(result.promotion?.discount_type).toBe('percentage')
  })

  it('clamps a fixed discount to the subtotal', async () => {
    mockTables({
      promotion: promoRow({ discount_type: 'fixed', discount_value: 500 }),
    })
    const result = await validatePromoCode('SAVE10', ctx)
    expect(result.valid).toBe(true)
    expect(result.discountAmount).toBe(200)
  })

  it('coerces Decimal-as-string values from PostgREST', async () => {
    mockTables({
      promotion: promoRow({ discount_value: '12.50' }),
    })
    const result = await validatePromoCode('SAVE10', { ...ctx, subtotal: 100 })
    expect(result.valid).toBe(true)
    expect(result.discountAmount).toBe(12.5)
  })
})
