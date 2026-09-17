import { describe, it, expect, beforeEach } from 'vitest'
import { usePosStore } from '../use-pos-store'

describe('usePosStore', () => {
  beforeEach(() => {
    usePosStore.getState().clearCart()
    usePosStore.getState().setTerminal(null)
    usePosStore.getState().setSession(null)
    usePosStore.getState().setCustomer(null)
    usePosStore.getState().setTaxRates([])
    usePosStore.getState().setHeldOrders([])
  })

  it('adds items and calculates subtotal correctly', () => {
    const { addItem, getSubtotal, getItemCount } = usePosStore.getState()

    addItem({
      productId: 'prod-1',
      productVariantId: 'var-1',
      name: 'Item A',
      sku: 'SKU-A',
      unitPrice: 20,
      quantity: 2,
    })

    expect(usePosStore.getState().items).toHaveLength(1)
    expect(getSubtotal()).toBe(40)
    expect(getItemCount()).toBe(2)

    // Adding same variant increases quantity
    addItem({
      productId: 'prod-1',
      productVariantId: 'var-1',
      name: 'Item A',
      sku: 'SKU-A',
      unitPrice: 20,
      quantity: 1,
    })

    expect(usePosStore.getState().items).toHaveLength(1)
    expect(usePosStore.getState().items[0].quantity).toBe(3)
    expect(usePosStore.getState().getSubtotal()).toBe(60)
  })

  it('applies percentage and fixed line discounts', () => {
    const { addItem, applyItemDiscount } = usePosStore.getState()

    addItem({
      productId: 'prod-1',
      productVariantId: 'var-1',
      name: 'Item A',
      sku: 'SKU-A',
      unitPrice: 100,
      quantity: 1,
    })

    const lineId = usePosStore.getState().items[0].id

    // 20% discount
    applyItemDiscount(lineId, { type: 'percentage', value: 20 })
    expect(usePosStore.getState().items[0].discountAmount).toBe(20)
    expect(usePosStore.getState().items[0].total).toBe(80)

    // Fixed $35 discount
    applyItemDiscount(lineId, { type: 'fixed', value: 35 })
    expect(usePosStore.getState().items[0].discountAmount).toBe(35)
    expect(usePosStore.getState().items[0].total).toBe(65)
  })

  it('calculates order-level cart discount', () => {
    const { addItem, applyCartDiscount, getTotalAmount, getCartDiscountAmount } =
      usePosStore.getState()

    addItem({
      productId: 'prod-1',
      productVariantId: 'var-1',
      name: 'Item A',
      sku: 'SKU-A',
      unitPrice: 50,
      quantity: 2, // subtotal = 100
    })

    applyCartDiscount({ type: 'percentage', value: 10 })
    expect(getCartDiscountAmount()).toBe(10)
    expect(getTotalAmount()).toBe(90)
  })

  it('calculates exclusive tax correctly', () => {
    const { addItem, setTaxRates, getTaxAmount, getTotalAmount } =
      usePosStore.getState()

    setTaxRates([{ rate: 10, is_inclusive: false, name: 'VAT 10%' }])

    addItem({
      productId: 'prod-1',
      productVariantId: 'var-1',
      name: 'Item A',
      sku: 'SKU-A',
      unitPrice: 100,
      quantity: 1,
    })

    expect(getTaxAmount()).toBe(10)
    expect(getTotalAmount()).toBe(110)
  })

  it('holds and resumes cart accurately', () => {
    const { addItem, holdCart, resumeHeldCart, clearCart } =
      usePosStore.getState()

    addItem({
      productId: 'prod-1',
      productVariantId: 'var-1',
      name: 'Coffee',
      sku: 'SKU-COF',
      unitPrice: 5,
      quantity: 2,
    })

    const held = holdCart('Table 3')
    expect(held).not.toBeNull()
    expect(usePosStore.getState().items).toHaveLength(0)
    expect(usePosStore.getState().heldOrders).toHaveLength(1)

    // Resume cart
    const ok = resumeHeldCart(held!.id)
    expect(ok).toBe(true)
    expect(usePosStore.getState().items).toHaveLength(1)
    expect(usePosStore.getState().items[0].name).toBe('Coffee')
    expect(usePosStore.getState().heldOrders).toHaveLength(0)
  })
})
