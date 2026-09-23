import { describe, it, expect, beforeEach } from 'vitest'
import { usePosStore } from '../use-pos-store'

describe('usePosStore - Promotions & Discounts', () => {
  beforeEach(() => {
    usePosStore.getState().clearCart()
    usePosStore.getState().removePromotion()
    usePosStore.getState().removeCartDiscount()
  })

  it('calculates percentage promotion discount when cart qualifies', () => {
    // Add item: 2 x $50 = $100
    usePosStore.getState().addItem({
      productVariantId: 'v1',
      sku: 'SKU-1',
      name: 'Product 1',
      unitPrice: 50,
      quantity: 2,
    })

    expect(usePosStore.getState().getSubtotal()).toBe(100)

    // Apply 20% discount with min_order_amount = 50
    usePosStore.getState().applyPromotion({
      promotion_id: 'promo-1',
      name: '20% OFF',
      code: 'SAVE20',
      discount_type: 'percentage',
      discount_value: 20,
      min_order_amount: 50,
    })

    expect(usePosStore.getState().getCartDiscountAmount()).toBe(20)
    expect(usePosStore.getState().getTotalDiscountAmount()).toBe(20)
    expect(usePosStore.getState().getTotalAmount()).toBe(80)
  })

  it('does not apply discount if cart subtotal is below min_order_amount', () => {
    // Add item: 1 x $30 = $30
    usePosStore.getState().addItem({
      productVariantId: 'v2',
      sku: 'SKU-2',
      name: 'Product 2',
      unitPrice: 30,
      quantity: 1,
    })

    expect(usePosStore.getState().getSubtotal()).toBe(30)

    // Apply promo requiring $50 minimum order
    usePosStore.getState().applyPromotion({
      promotion_id: 'promo-min',
      name: 'Min 50 promo',
      discount_type: 'fixed',
      discount_value: 10,
      min_order_amount: 50,
    })

    // Subtotal 30 < minOrder 50 -> discount is 0
    expect(usePosStore.getState().getCartDiscountAmount()).toBe(0)

    // Add another item: 1 x $30 -> total 60 >= 50 -> discount applies
    usePosStore.getState().addItem({
      productVariantId: 'v3',
      sku: 'SKU-3',
      name: 'Product 3',
      unitPrice: 30,
      quantity: 1,
    })

    expect(usePosStore.getState().getSubtotal()).toBe(60)
    expect(usePosStore.getState().getCartDiscountAmount()).toBe(10)
    expect(usePosStore.getState().getTotalAmount()).toBe(50)
  })

  it('caps discount at max_discount_amount', () => {
    // Add item: 1 x $1000 = $1000
    usePosStore.getState().addItem({
      productVariantId: 'v4',
      sku: 'SKU-4',
      name: 'Expensive Product',
      unitPrice: 1000,
      quantity: 1,
    })

    // Apply 50% discount capped at $100
    usePosStore.getState().applyPromotion({
      promotion_id: 'promo-cap',
      name: 'Big Sale',
      discount_type: 'percentage',
      discount_value: 50,
      max_discount_amount: 100,
    })

    // 50% of 1000 is 500, but capped at 100
    expect(usePosStore.getState().getCartDiscountAmount()).toBe(100)
    expect(usePosStore.getState().getTotalAmount()).toBe(900)
  })

  it('removes applied promotion cleanly', () => {
    usePosStore.getState().addItem({
      productVariantId: 'v5',
      sku: 'SKU-5',
      name: 'Product 5',
      unitPrice: 100,
      quantity: 1,
    })

    usePosStore.getState().applyPromotion({
      promotion_id: 'promo-rem',
      name: 'Temporary Promo',
      discount_type: 'fixed',
      discount_value: 25,
    })

    expect(usePosStore.getState().getCartDiscountAmount()).toBe(25)

    usePosStore.getState().removePromotion()
    expect(usePosStore.getState().appliedPromotion).toBeUndefined()
    expect(usePosStore.getState().getCartDiscountAmount()).toBe(0)
    expect(usePosStore.getState().getTotalAmount()).toBe(100)
  })
})
