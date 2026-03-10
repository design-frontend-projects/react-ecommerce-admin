import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useResposStore } from './respos-store'
import { validatePromoCode } from '@/features/respos/lib/promotion-validator'

vi.mock('@/features/respos/lib/promotion-validator', () => ({
  validatePromoCode: vi.fn(),
}))

describe('useResposStore', () => {
  beforeEach(() => {
    useResposStore.getState().clearCart()
    vi.clearAllMocks()
  })

  it('should apply manual discount with 10% limit (percentage)', () => {
    const store = useResposStore.getState()
    
    // Add item worth 100
    store.addToCart({ id: '1', base_price: 100, name: 'Item 1' } as any)
    
    // Set 15% discount
    store.setManualDiscount(15, 'percentage')
    
    const cart = useResposStore.getState().cart
    expect(cart.manualDiscountAmount).toBe(10) // Capped at 10%
    expect(cart.total).toBe(102.6) // (100 - 10) * 1.14 (default tax 0.14)
  })

  it('should apply manual discount with 10% limit (fixed)', () => {
    const store = useResposStore.getState()
    
    // Add item worth 200
    store.addToCart({ id: '1', base_price: 200, name: 'Item 1' } as any)
    
    // Set 30 fixed discount (max is 10% of 200 = 20)
    store.setManualDiscount(30, 'fixed')
    
    const cart = useResposStore.getState().cart
    expect(cart.manualDiscountAmount).toBe(20) // Capped at 20
  })

  it('should apply promo code correctly', async () => {
    const mockValidate = vi.mocked(validatePromoCode)
    mockValidate.mockResolvedValue({
      valid: true,
      discountAmount: 15,
      promotion: { promotion_id: 1, code: 'PROMO15' } as any,
    })

    const store = useResposStore.getState()
    store.addToCart({ id: '1', base_price: 100, name: 'Item 1' } as any)
    
    const result = await store.applyPromoCode('PROMO15')
    
    expect(result.success).toBe(true)
    const cart = useResposStore.getState().cart
    expect(cart.promoCode).toBe('PROMO15')
    expect(cart.promoDiscountAmount).toBe(15)
  })

  it('should handle both manual and promo discounts (additive)', async () => {
    const mockValidate = vi.mocked(validatePromoCode)
    mockValidate.mockResolvedValue({
      valid: true,
      discountAmount: 10,
      promotion: { promotion_id: 1, code: 'PROMO10' } as any,
    })

    const store = useResposStore.getState()
    store.addToCart({ id: '1', base_price: 100, name: 'Item 1' } as any)
    
    // Apply 5% manual discount (5 USD)
    store.setManualDiscount(5, 'percentage')
    // Apply 10 USD promo discount
    await store.applyPromoCode('PROMO10')
    
    const cart = useResposStore.getState().cart
    // Total discount = 5 + 10 = 15
    // Taxable = 100 - 15 = 85
    // Total = 85 * 1.14 = 96.9
    expect(cart.total).toBe(96.9)
  })

  it('should calculate change for cash payments', () => {
    const store = useResposStore.getState()
    store.addToCart({ id: '1', base_price: 100, name: 'Item 1' } as any)
    
    // Total is 114 (100 subtotal + 14 tax)
    store.setPaymentMethod('Cash')
    store.setReceivedAmount(150)
    
    const cart = useResposStore.getState().cart
    expect(cart.changeAmount).toBe(36)
  })
})
