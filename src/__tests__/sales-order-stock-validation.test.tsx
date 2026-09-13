import { describe, test, expect } from 'vitest'
import {
  getAvailableStock,
  getVariantStockSummary,
} from '@/features/sales-orders/utils/variant-stock'
import type { SOVariantOption } from '@/features/sales-orders/components/so-product-variant-picker'

describe('Sales Order Stock Availability & Row Validation', () => {
  const sampleVariant: SOVariantOption = {
    id: 'var-1',
    sku: 'SKU-001',
    name: 'Standard Variant',
    price: 150,
    stock_quantity: 100,
    stock_balances: [
      {
        warehouse_id: 'wh-cairo',
        store_id: 'store-cairo',
        qty_on_hand: 50,
        qty_reserved: 10,
        qty_available: 40,
      },
      {
        warehouse_id: 'wh-alex',
        store_id: 'store-alex',
        qty_on_hand: 30,
        qty_reserved: 5,
        qty_available: 25,
      },
    ],
  }

  describe('getVariantStockSummary calculation', () => {
    test('returns exact onHand, reserved, and available for the selected warehouse', () => {
      const cairoSummary = getVariantStockSummary(sampleVariant, 'wh-cairo')
      expect(cairoSummary).toMatchObject({
        onHand: 50,
        reserved: 10,
        available: 40,
        isAvailable: true,
        isOutOfStock: false,
      })

      const alexSummary = getVariantStockSummary(sampleVariant, 'wh-alex')
      expect(alexSummary).toMatchObject({
        onHand: 30,
        reserved: 5,
        available: 25,
        isAvailable: true,
        isOutOfStock: false,
      })
    })

    test('returns zero values if the variant has no stock in the warehouse', () => {
      const suezSummary = getVariantStockSummary(sampleVariant, 'wh-suez')
      expect(suezSummary).toMatchObject({
        onHand: 0,
        reserved: 0,
        available: 0,
        isAvailable: false,
        isOutOfStock: true,
      })
    })

    test('aggregates multiple stock balance rows for the same warehouse', () => {
      const multiLocVariant: SOVariantOption = {
        id: 'var-multi',
        sku: 'SKU-MULTI',
        price: 99,
        stock_balances: [
          {
            warehouse_id: 'wh-cairo',
            location_id: 'loc-aisle-1',
            qty_on_hand: 30,
            qty_reserved: 5,
            qty_available: 25,
          },
          {
            warehouse_id: 'wh-cairo',
            location_id: 'loc-aisle-2',
            qty_on_hand: 20,
            qty_reserved: 3,
            qty_available: 17,
          },
        ],
      }
      const summary = getVariantStockSummary(multiLocVariant, 'wh-cairo')
      expect(summary).toMatchObject({
        onHand: 50,
        reserved: 8,
        available: 42,
        isAvailable: true,
        isOutOfStock: false,
      })
    })

    test('falls back to store stock when warehouse is not specified', () => {
      const storeSummary = getVariantStockSummary(sampleVariant, undefined, 'store-cairo')
      expect(storeSummary).toMatchObject({
        onHand: 50,
        reserved: 10,
        available: 40,
        isAvailable: true,
      })
    })

    test('aggregates all warehouses when neither warehouse nor store is specified', () => {
      const totalSummary = getVariantStockSummary(sampleVariant)
      expect(totalSummary).toMatchObject({
        onHand: 80,
        reserved: 15,
        available: 65,
        isAvailable: true,
      })
    })
  })

  describe('getAvailableStock calculation', () => {
    test('returns exact available stock for the selected warehouse', () => {
      const cairoStock = getAvailableStock(sampleVariant, 'wh-cairo')
      expect(cairoStock).toBe(40)

      const alexStock = getAvailableStock(sampleVariant, 'wh-alex')
      expect(alexStock).toBe(25)
    })

    test('returns 0 if the variant has no stock record in the selected warehouse', () => {
      const suezStock = getAvailableStock(sampleVariant, 'wh-suez')
      expect(suezStock).toBe(0)
    })

    test('falls back to store stock when warehouse is not specified', () => {
      const storeCairoStock = getAvailableStock(sampleVariant, undefined, 'store-cairo')
      expect(storeCairoStock).toBe(40)

      const storeAlexStock = getAvailableStock(sampleVariant, undefined, 'store-alex')
      expect(storeAlexStock).toBe(25)
    })

    test('aggregates all warehouse balances when neither warehouse nor store is specified', () => {
      const totalAvailable = getAvailableStock(sampleVariant)
      expect(totalAvailable).toBe(65) // 40 + 25
    })

    test('falls back to stock_quantity if stock_balances is empty or absent', () => {
      const variantWithoutBalances: SOVariantOption = {
        id: 'var-simple',
        sku: 'SKU-SIMPLE',
        price: 200,
        stock_quantity: 15,
      }
      const available = getAvailableStock(variantWithoutBalances, 'wh-cairo')
      expect(available).toBe(15)
    })

    test('correctly computes available stock when qty_available is null using (on_hand - reserved)', () => {
      const variantWithComputedAvailable: SOVariantOption = {
        id: 'var-comp',
        sku: 'SKU-COMP',
        price: 50,
        stock_balances: [
          {
            warehouse_id: 'wh-1',
            qty_on_hand: 100,
            qty_reserved: 35,
            qty_available: null,
          },
        ],
      }
      const available = getAvailableStock(variantWithComputedAvailable, 'wh-1')
      expect(available).toBe(65)
    })

    test('never returns negative numbers if reservations exceed on-hand', () => {
      const variantWithDeficit: SOVariantOption = {
        id: 'var-deficit',
        sku: 'SKU-DEF',
        price: 20,
        stock_balances: [
          {
            warehouse_id: 'wh-deficit',
            qty_on_hand: 5,
            qty_reserved: 10,
            qty_available: -5,
          },
        ],
      }
      const available = getAvailableStock(variantWithDeficit, 'wh-deficit')
      expect(available).toBe(0)
    })
  })

  describe('Quantity threshold & Exceeded Stock Detection', () => {
    test('correctly identifies when quantity exceeds warehouse available stock', () => {
      const availableStock = getAvailableStock(sampleVariant, 'wh-cairo') // 40
      const validQty = 35
      const exactQty = 40
      const exceededQty = 41

      expect(validQty > availableStock).toBe(false)
      expect(exactQty > availableStock).toBe(false)
      expect(exceededQty > availableStock).toBe(true)
    })

    test('flags stock exceeded even with zero available stock', () => {
      const zeroStockVariant: SOVariantOption = {
        id: 'var-out',
        sku: 'SKU-OUT',
        price: 10,
        stock_balances: [
          {
            warehouse_id: 'wh-cairo',
            qty_on_hand: 0,
            qty_reserved: 0,
            qty_available: 0,
          },
        ],
      }
      const availableStock = getAvailableStock(zeroStockVariant, 'wh-cairo')
      expect(availableStock).toBe(0)
      expect(1 > availableStock).toBe(true)
    })
  })

  describe('Add Item Row Completion Guard', () => {
    interface LineItemState {
      productId: string | null
      productVariantId: string
      qty: string
    }

    function canAddNewRow(lastItem: LineItemState | undefined, variantStock: number): {
      allowed: boolean
      error?: 'incomplete' | 'stock_exceeded'
    } {
      if (!lastItem) return { allowed: true }
      const hasProduct = Boolean(lastItem.productId)
      const hasVariant = Boolean(lastItem.productVariantId)
      const hasQty = Number(lastItem.qty) > 0

      if (!hasProduct || !hasVariant || !hasQty) {
        return { allowed: false, error: 'incomplete' }
      }

      if (Number(lastItem.qty) > variantStock) {
        return { allowed: false, error: 'stock_exceeded' }
      }

      return { allowed: true }
    }

    test('blocks adding new item if product is missing', () => {
      const incompleteItem: LineItemState = {
        productId: null,
        productVariantId: '',
        qty: '5',
      }
      const result = canAddNewRow(incompleteItem, 100)
      expect(result.allowed).toBe(false)
      expect(result.error).toBe('incomplete')
    })

    test('blocks adding new item if variant is missing', () => {
      const incompleteItem: LineItemState = {
        productId: 'prod-1',
        productVariantId: '',
        qty: '5',
      }
      const result = canAddNewRow(incompleteItem, 100)
      expect(result.allowed).toBe(false)
      expect(result.error).toBe('incomplete')
    })

    test('blocks adding new item if quantity is zero or empty', () => {
      const zeroQtyItem: LineItemState = {
        productId: 'prod-1',
        productVariantId: 'var-1',
        qty: '0',
      }
      const result = canAddNewRow(zeroQtyItem, 100)
      expect(result.allowed).toBe(false)
      expect(result.error).toBe('incomplete')

      const emptyQtyItem: LineItemState = {
        productId: 'prod-1',
        productVariantId: 'var-1',
        qty: '',
      }
      expect(canAddNewRow(emptyQtyItem, 100).allowed).toBe(false)
    })

    test('blocks adding new item if current row quantity exceeds available stock', () => {
      const exceededItem: LineItemState = {
        productId: 'prod-1',
        productVariantId: 'var-1',
        qty: '45',
      }
      const result = canAddNewRow(exceededItem, 40)
      expect(result.allowed).toBe(false)
      expect(result.error).toBe('stock_exceeded')
    })

    test('allows adding new item when current row is fully completed and within stock limits', () => {
      const validItem: LineItemState = {
        productId: 'prod-1',
        productVariantId: 'var-1',
        qty: '20',
      }
      const result = canAddNewRow(validItem, 40)
      expect(result.allowed).toBe(true)
      expect(result.error).toBeUndefined()
    })
  })
})
