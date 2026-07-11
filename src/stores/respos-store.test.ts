import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  validatePromoCode,
  validatePromotion,
} from '@/features/respos/lib/promotion-validator'
import type { ResPromotion } from '@/features/respos/types'
import { useResposStore } from './respos-store'

// zustand's persist middleware needs a Storage implementation; the Node test
// environment does not provide one. Hoisted so it exists before the store
// module is imported.
vi.hoisted(() => {
  const storage = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => void storage.set(key, value),
      removeItem: (key: string) => void storage.delete(key),
      clear: () => storage.clear(),
      key: (index: number) => [...storage.keys()][index] ?? null,
      get length() {
        return storage.size
      },
    },
  })
})

vi.mock('@/features/respos/lib/promotion-validator', () => ({
  validatePromoCode: vi.fn(),
  validatePromotion: vi.fn(),
  fetchEligiblePromotions: vi.fn(),
}))

// Line pricing comes from variant price_adjustment + properties (base_price
// is not used by addToCart), so items are added with a priced variant.
const addItem = (id: string, unitPrice: number, times = 1) => {
  const store = useResposStore.getState()
  for (let i = 0; i < times; i++) {
    store.addToCart(
      { id, name: `Item ${id}`, category_id: 'cat-1' } as never,
      { id: `${id}-v`, price_adjustment: unitPrice } as never
    )
  }
}

const makePromo = (overrides: Partial<ResPromotion> = {}): ResPromotion => ({
  promotion_id: 1,
  code: 'PROMO',
  name: 'Promo',
  description: null,
  discount_type: 'percentage',
  discount_value: 10,
  minimum_purchase: null,
  start_date: new Date(Date.now() - 86400000).toISOString(),
  end_date: new Date(Date.now() + 86400000).toISOString(),
  usage_limit: null,
  usage_per_customer: null,
  is_active: true,
  activities: ['dine_in', 'takeaway', 'delivery'],
  promo_type: 'order_discount',
  created_at: new Date().toISOString(),
  ...overrides,
})

describe('useResposStore', () => {
  beforeEach(() => {
    const store = useResposStore.getState()
    store.clearCart()
    store.setTaxConfig({ rate: 0.14, isInclusive: false })
    store.setOrderType('dine_in')
    vi.clearAllMocks()
  })

  it('should apply manual discount with 10% limit (percentage)', () => {
    const store = useResposStore.getState()
    addItem('1', 100)

    store.setManualDiscount(15, 'percentage')

    const cart = useResposStore.getState().cart
    expect(cart.manualDiscountAmount).toBe(10) // Capped at 10%
    expect(cart.total).toBe(102.6) // (100 - 10) * 1.14 (exclusive 14% tax)
  })

  it('should apply manual discount with 10% limit (fixed)', () => {
    const store = useResposStore.getState()
    addItem('1', 200)

    store.setManualDiscount(30, 'fixed')

    const cart = useResposStore.getState().cart
    expect(cart.manualDiscountAmount).toBe(20) // Capped at 10% of 200
  })

  it('should apply promo code and recompute the discount from the promotion', async () => {
    const promotion = makePromo({
      code: 'PROMO15',
      discount_type: 'fixed',
      discount_value: 15,
    })
    vi.mocked(validatePromoCode).mockResolvedValue({
      valid: true,
      discountAmount: 15,
      promotion,
    })

    const store = useResposStore.getState()
    addItem('1', 100)

    const result = await store.applyPromoCode('PROMO15')

    expect(result.success).toBe(true)
    const cart = useResposStore.getState().cart
    expect(cart.promoCode).toBe('PROMO15')
    expect(cart.promoDiscountAmount).toBe(15)
  })

  it('should surface structured errors from validation', async () => {
    vi.mocked(validatePromoCode).mockResolvedValue({
      valid: false,
      discountAmount: 0,
      error: { key: 'respos.promo.error.expired' },
    })

    const store = useResposStore.getState()
    addItem('1', 100)

    const result = await store.applyPromoCode('OLD')
    expect(result.success).toBe(false)
    expect(result.error?.key).toBe('respos.promo.error.expired')
  })

  it('should handle both manual and promo discounts (additive)', async () => {
    const promotion = makePromo({
      code: 'PROMO10',
      discount_type: 'fixed',
      discount_value: 10,
    })
    vi.mocked(validatePromoCode).mockResolvedValue({
      valid: true,
      discountAmount: 10,
      promotion,
    })

    const store = useResposStore.getState()
    addItem('1', 100)

    store.setManualDiscount(5, 'percentage')
    await store.applyPromoCode('PROMO10')

    const cart = useResposStore.getState().cart
    // Taxable = 100 - (5 + 10) = 85; Total = 85 * 1.14 = 96.9
    expect(cart.total).toBe(96.9)
  })

  it('should calculate change for cash payments', () => {
    const store = useResposStore.getState()
    addItem('1', 100)

    store.setPaymentMethod('Cash')
    store.setReceivedAmount(150)

    const cart = useResposStore.getState().cart
    expect(cart.total).toBe(114)
    expect(cart.changeAmount).toBe(36)
  })

  it('should derive embedded tax when the rate is inclusive', () => {
    const store = useResposStore.getState()
    store.setTaxConfig({ rate: 0.14, isInclusive: true })
    addItem('1', 114)

    const cart = useResposStore.getState().cart
    expect(cart.taxAmount).toBe(14) // 114 - 114/1.14
    expect(cart.total).toBe(114) // nothing added on top
  })

  it('should recalculate an in-flight cart when the tax config changes', () => {
    const store = useResposStore.getState()
    addItem('1', 100)
    expect(useResposStore.getState().cart.total).toBe(114)

    store.setTaxConfig({ rate: 0.1, isInclusive: false })
    expect(useResposStore.getState().cart.total).toBeCloseTo(110, 2)
  })

  it('should auto-remove a promo when the cart drops below minimum purchase', async () => {
    const promotion = makePromo({
      code: 'MIN50',
      discount_type: 'fixed',
      discount_value: 10,
      minimum_purchase: 50,
    })
    vi.mocked(validatePromoCode).mockResolvedValue({
      valid: true,
      discountAmount: 10,
      promotion,
    })

    const store = useResposStore.getState()
    addItem('1', 30, 2) // subtotal 60
    await store.applyPromoCode('MIN50')
    expect(useResposStore.getState().cart.promotion).toBeDefined()

    useResposStore.getState().updateCartItemQuantity(0, 1) // subtotal 30

    const cart = useResposStore.getState().cart
    expect(cart.promotion).toBeUndefined()
    expect(cart.promoDiscountAmount).toBe(0)
    expect(cart.promoRemovedKey).toBe('respos.promo.error.minPurchase')
  })

  it('should recompute buy-x-get-y discounts as quantities change', async () => {
    const promotion = makePromo({
      code: 'BOGO',
      promo_type: 'buy_x_get_y',
      buy_quantity: 2,
      get_quantity: 1,
      get_discount_value: 100,
      scopes: [
        {
          scope_id: 1,
          promotion_id: 1,
          menu_item_id: 'a',
          menu_category_id: null,
          scope_role: 'buy',
        },
      ],
    })
    vi.mocked(validatePromotion).mockResolvedValue({
      valid: true,
      discountAmount: 10,
      promotion,
    })

    const store = useResposStore.getState()
    addItem('a', 10, 3)

    const result = await store.applyPromotion(promotion)
    expect(result.success).toBe(true)
    expect(useResposStore.getState().cart.promoDiscountAmount).toBe(10)

    // 5 units → floor(5/2) = 2 sets → 2 free units
    useResposStore.getState().updateCartItemQuantity(0, 5)
    expect(useResposStore.getState().cart.promoDiscountAmount).toBe(20)

    // 1 unit → no complete set → promo auto-removed
    useResposStore.getState().updateCartItemQuantity(0, 1)
    const cart = useResposStore.getState().cart
    expect(cart.promotion).toBeUndefined()
    expect(cart.promoRemovedKey).toBe('respos.promo.error.notEligibleItems')
  })

  it('should drop an activity-scoped promo when the channel switches', async () => {
    const promotion = makePromo({
      code: 'DINEONLY',
      activities: ['dine_in'],
      discount_type: 'fixed',
      discount_value: 5,
    })
    vi.mocked(validatePromoCode).mockResolvedValue({
      valid: true,
      discountAmount: 5,
      promotion,
    })

    const store = useResposStore.getState()
    addItem('1', 100)
    await store.applyPromoCode('DINEONLY')
    expect(useResposStore.getState().cart.promotion).toBeDefined()

    useResposStore.getState().setOrderType('delivery')

    const cart = useResposStore.getState().cart
    expect(cart.promotion).toBeUndefined()
    expect(cart.promoRemovedKey).toBe('respos.promo.error.activityMismatch')
    expect(useResposStore.getState().orderType).toBe('delivery')
  })
})
