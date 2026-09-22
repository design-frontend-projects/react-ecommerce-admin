import { describe, it, expect, beforeEach } from 'vitest'
import { usePosStore } from '@/features/pos/store/use-pos-store'
import type { PosProductVariant } from '@/features/pos/data/api'

describe('POS Stock Balance & Cart Stock Protection', () => {
  beforeEach(() => {
    usePosStore.getState().clearCart()
    usePosStore.getState().setCustomer(null)
  })

  it('stores availableQuantity when adding items to cart', () => {
    const store = usePosStore.getState()

    store.addItem({
      productId: 'prod-1',
      productVariantId: 'var-1',
      name: 'Coffee Mug',
      sku: 'MUG-001',
      unitPrice: 15.0,
      quantity: 1,
      availableQuantity: 5,
    })

    const items = usePosStore.getState().items
    expect(items).toHaveLength(1)
    expect(items[0].availableQuantity).toBe(5)
    expect(items[0].quantity).toBe(1)
    expect(usePosStore.getState().hasStockErrors()).toBe(false)
  })

  it('caps quantity to availableQuantity on repeated addItem calls', () => {
    const store = usePosStore.getState()

    // Add 3 out of 5 available
    store.addItem({
      productId: 'prod-1',
      productVariantId: 'var-1',
      name: 'Coffee Mug',
      sku: 'MUG-001',
      unitPrice: 15.0,
      quantity: 3,
      availableQuantity: 5,
    })

    // Attempt to add 3 more (total 6 > 5)
    store.addItem({
      productId: 'prod-1',
      productVariantId: 'var-1',
      name: 'Coffee Mug',
      sku: 'MUG-001',
      unitPrice: 15.0,
      quantity: 3,
      availableQuantity: 5,
    })

    const items = usePosStore.getState().items
    expect(items).toHaveLength(1)
    // Should be clamped to 5
    expect(items[0].quantity).toBe(5)
    expect(usePosStore.getState().hasStockErrors()).toBe(false)
  })

  it('flags stock error when quantity is manually updated to exceed available stock', () => {
    const store = usePosStore.getState()

    store.addItem({
      productId: 'prod-1',
      productVariantId: 'var-1',
      name: 'Coffee Mug',
      sku: 'MUG-001',
      unitPrice: 15.0,
      quantity: 2,
      availableQuantity: 4,
    })

    const lineId = usePosStore.getState().items[0].id

    // User forces quantity to 10
    store.updateQuantity(lineId, 10)

    expect(usePosStore.getState().items[0].quantity).toBe(10)
    expect(usePosStore.getState().hasStockErrors()).toBe(true)

    // User reduces quantity back to 4
    store.updateQuantity(lineId, 4)
    expect(usePosStore.getState().hasStockErrors()).toBe(false)
  })

  it('removes item when quantity is reduced to 0', () => {
    const store = usePosStore.getState()

    store.addItem({
      productId: 'prod-1',
      productVariantId: 'var-1',
      name: 'Coffee Mug',
      sku: 'MUG-001',
      unitPrice: 15.0,
      quantity: 1,
      availableQuantity: 2,
    })

    const lineId = usePosStore.getState().items[0].id
    store.updateQuantity(lineId, 0)

    expect(usePosStore.getState().items).toHaveLength(0)
    expect(usePosStore.getState().hasStockErrors()).toBe(false)
  })

  it('evaluates variant disabled state based on available store stock', () => {
    const inStockVariant: PosProductVariant = {
      id: 'var-in-stock',
      sku: 'SKU-001',
      barcode: null,
      price: 20,
      stock_quantity: 10,
      stockAvailable: 10,
      stockOnHand: 15,
      min_stock: 5,
      is_active: true,
    }

    const outOfStockVariant: PosProductVariant = {
      id: 'var-out-of-stock',
      sku: 'SKU-002',
      barcode: null,
      price: 25,
      stock_quantity: 0,
      stockAvailable: 0,
      stockOnHand: 0,
      min_stock: 5,
      is_active: true,
    }

    const isVariantDisabled = (v: PosProductVariant) => {
      const avail = v.stockAvailable ?? v.stock_quantity ?? 0
      return avail <= 0
    }

    expect(isVariantDisabled(inStockVariant)).toBe(false)
    expect(isVariantDisabled(outOfStockVariant)).toBe(true)
  })

  it('correctly aggregates stock_balances with qty_available null fallback', () => {
    const stockBalances = [
      {
        product_variant_id: 'var-1',
        qty_on_hand: 50,
        qty_reserved: 10,
        qty_available: null, // null in DB
      },
      {
        product_variant_id: 'var-1',
        qty_on_hand: 20,
        qty_reserved: 5,
        qty_available: 15, // explicitly 15
      },
      {
        product_variant_id: 'var-2',
        qty_on_hand: 5,
        qty_reserved: 5,
        qty_available: null, // 5 - 5 = 0
      },
    ]

    const stockMap = new Map<string, { totalAvailable: number; totalOnHand: number; totalReserved: number }>()

    for (const sb of stockBalances) {
      const variantId = sb.product_variant_id
      const existing = stockMap.get(variantId) ?? {
        totalAvailable: 0,
        totalOnHand: 0,
        totalReserved: 0,
      }
      const onHand = Number(sb.qty_on_hand ?? 0)
      const reserved = Number(sb.qty_reserved ?? 0)
      const available =
        sb.qty_available != null
          ? Number(sb.qty_available)
          : Math.max(0, onHand - reserved)

      existing.totalAvailable += available
      existing.totalOnHand += onHand
      existing.totalReserved += reserved
      stockMap.set(variantId, existing)
    }

    // var-1: (50 - 10 = 40) + 15 = 55 available, 70 on hand, 15 reserved
    expect(stockMap.get('var-1')?.totalAvailable).toBe(55)
    expect(stockMap.get('var-1')?.totalOnHand).toBe(70)
    expect(stockMap.get('var-1')?.totalReserved).toBe(15)

    // var-2: 5 - 5 = 0 available, 5 on hand, 5 reserved
    expect(stockMap.get('var-2')?.totalAvailable).toBe(0)
    expect(stockMap.get('var-2')?.totalOnHand).toBe(5)
  })
})
