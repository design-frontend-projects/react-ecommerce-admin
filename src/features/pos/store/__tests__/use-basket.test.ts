import { beforeEach, describe, expect, it } from 'vitest'
import { useBasket } from '../use-basket'

describe('useBasket variant-aware identity', () => {
  beforeEach(() => {
    useBasket.getState().clearBasket()
  })

  it('merges quantity only when product and variant are the same', () => {
    const state = useBasket.getState()

    state.addItem({
      productId: 10,
      productVariantId: 'variant-a',
      name: 'Coffee - Small',
      sku: 'COF-S',
      barcode: null,
      unitPrice: 3,
      quantity: 1,
    })

    state.addItem({
      productId: 10,
      productVariantId: 'variant-a',
      name: 'Coffee - Small',
      sku: 'COF-S',
      barcode: null,
      unitPrice: 3,
      quantity: 1,
    })

    const items = useBasket.getState().items
    expect(items).toHaveLength(1)
    expect(items[0].quantity).toBe(2)
  })

  it('keeps separate lines for different variants of the same product', () => {
    const state = useBasket.getState()

    state.addItem({
      productId: 10,
      productVariantId: 'variant-a',
      name: 'Coffee - Small',
      sku: 'COF-S',
      barcode: null,
      unitPrice: 3,
      quantity: 1,
    })

    state.addItem({
      productId: 10,
      productVariantId: 'variant-b',
      name: 'Coffee - Large',
      sku: 'COF-L',
      barcode: null,
      unitPrice: 5,
      quantity: 1,
    })

    const items = useBasket.getState().items
    expect(items).toHaveLength(2)
    expect(items.map((i) => i.productVariantId).sort()).toEqual([
      'variant-a',
      'variant-b',
    ])
  })

  it('updates and removes only the targeted variant line', () => {
    const state = useBasket.getState()

    state.addItem({
      productId: 11,
      productVariantId: 'variant-a',
      name: 'Tea - Small',
      sku: 'TEA-S',
      barcode: null,
      unitPrice: 2,
      quantity: 1,
    })
    state.addItem({
      productId: 11,
      productVariantId: 'variant-b',
      name: 'Tea - Large',
      sku: 'TEA-L',
      barcode: null,
      unitPrice: 4,
      quantity: 1,
    })

    state.updateQuantity(11, 4, 'variant-a')

    let items = useBasket.getState().items
    const variantA = items.find((i) => i.productVariantId === 'variant-a')
    const variantB = items.find((i) => i.productVariantId === 'variant-b')

    expect(variantA?.quantity).toBe(4)
    expect(variantB?.quantity).toBe(1)

    state.removeItem(11, 'variant-b')
    items = useBasket.getState().items
    expect(items).toHaveLength(1)
    expect(items[0].productVariantId).toBe('variant-a')
  })

  it('applies discount only to the targeted variant line', () => {
    const state = useBasket.getState()

    state.addItem({
      productId: 12,
      productVariantId: 'variant-a',
      name: 'Cake Slice A',
      sku: 'CAKE-A',
      barcode: null,
      unitPrice: 6,
      quantity: 1,
    })
    state.addItem({
      productId: 12,
      productVariantId: 'variant-b',
      name: 'Cake Slice B',
      sku: 'CAKE-B',
      barcode: null,
      unitPrice: 7,
      quantity: 1,
    })

    state.applyItemDiscount(12, { type: 'fixed', value: 2 }, 'variant-a')

    const items = useBasket.getState().items
    const variantA = items.find((i) => i.productVariantId === 'variant-a')
    const variantB = items.find((i) => i.productVariantId === 'variant-b')

    expect(variantA?.total).toBe(4)
    expect(variantB?.total).toBe(7)
  })
})
