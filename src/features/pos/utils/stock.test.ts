import { describe, expect, it } from 'vitest'
import {
  getProductStockFlags,
  isVariantLowStock,
  isVariantSellable,
} from './stock'

describe('isVariantLowStock', () => {
  it('returns true when quantity is zero and min stock is zero', () => {
    expect(isVariantLowStock({ stock_quantity: 0, min_stock: 0 })).toBe(true)
  })

  it('returns true when quantity equals min stock', () => {
    expect(isVariantLowStock({ stock_quantity: 5, min_stock: 5 })).toBe(true)
  })

  it('returns true when quantity is below min stock', () => {
    expect(isVariantLowStock({ stock_quantity: 1, min_stock: 2 })).toBe(true)
  })

  it('returns false when quantity is above min stock', () => {
    expect(isVariantLowStock({ stock_quantity: 3, min_stock: 2 })).toBe(false)
  })

  it('treats missing values as 0', () => {
    expect(
      isVariantLowStock({ stock_quantity: undefined, min_stock: undefined })
    ).toBe(true)
  })
})

describe('isVariantSellable', () => {
  it('returns false when low stock', () => {
    expect(
      isVariantSellable({ stock_quantity: 0, min_stock: 0, is_active: true })
    ).toBe(false)
  })

  it('returns false when inactive', () => {
    expect(
      isVariantSellable({ stock_quantity: 10, min_stock: 0, is_active: false })
    ).toBe(false)
  })

  it('returns true when active and not low stock', () => {
    expect(
      isVariantSellable({ stock_quantity: 8, min_stock: 2, is_active: true })
    ).toBe(true)
  })
})

describe('getProductStockFlags', () => {
  it('marks mixed variants as low stock present and sellable present', () => {
    const flags = getProductStockFlags([
      { stock_quantity: 0, min_stock: 0, is_active: true },
      { stock_quantity: 5, min_stock: 1, is_active: true },
    ])

    expect(flags.hasLowStockVariants).toBe(true)
    expect(flags.hasSellableVariants).toBe(true)
  })

  it('marks all-low products as not sellable', () => {
    const flags = getProductStockFlags([
      { stock_quantity: 0, min_stock: 1, is_active: true },
      { stock_quantity: 1, min_stock: 1, is_active: true },
    ])

    expect(flags.hasLowStockVariants).toBe(true)
    expect(flags.hasSellableVariants).toBe(false)
  })
})

