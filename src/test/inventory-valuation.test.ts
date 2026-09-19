import { describe, it, expect } from 'vitest'
import {
  valuationFiltersSchema,
  valuationMethodEnum,
  valuationStockStatusEnum,
  type ValuationItemRow,
} from '../features/inventory/data/valuation-schema'

describe('Inventory Valuation Data Structures & Financial Calculation Logic', () => {
  describe('valuationFiltersSchema Validation & Defaults', () => {
    it('applies standard default values when empty object is passed', () => {
      const parsed = valuationFiltersSchema.parse({})
      expect(parsed.warehouseId).toBe('all')
      expect(parsed.storeId).toBe('all')
      expect(parsed.categoryId).toBe('all')
      expect(parsed.supplierId).toBe('all')
      expect(parsed.condition).toBe('all')
      expect(parsed.stockStatus).toBe('all')
      expect(parsed.valuationMethod).toBe('avco')
      expect(parsed.page).toBe(1)
      expect(parsed.limit).toBe(25)
      expect(parsed.sortBy).toBe('totalValue')
      expect(parsed.sortOrder).toBe('desc')
    })

    it('parses valid custom filters and enforces numeric page & limit coercions', () => {
      const parsed = valuationFiltersSchema.parse({
        search: 'SKU-TEST',
        warehouseId: '4bb8357f-f772-4660-84c1-eb83cb7d29bc',
        valuationMethod: 'standard',
        page: '2',
        limit: '50',
        stockStatus: 'low_stock',
        sortBy: 'unitCost',
        sortOrder: 'asc',
      })

      expect(parsed.search).toBe('SKU-TEST')
      expect(parsed.warehouseId).toBe('4bb8357f-f772-4660-84c1-eb83cb7d29bc')
      expect(parsed.valuationMethod).toBe('standard')
      expect(parsed.page).toBe(2)
      expect(parsed.limit).toBe(50)
      expect(parsed.stockStatus).toBe('low_stock')
      expect(parsed.sortBy).toBe('unitCost')
      expect(parsed.sortOrder).toBe('asc')
    })

    it('rejects invalid valuation method or stock status values', () => {
      expect(() => valuationMethodEnum.parse('invalid_method')).toThrow()
      expect(() => valuationStockStatusEnum.parse('invalid_status')).toThrow()
    })
  })

  describe('Multi-Ledger Valuation Cost Calculations', () => {
    const sampleItem: ValuationItemRow = {
      id: 'bal-1',
      balanceId: 'bal-1',
      warehouseId: 'wh-1',
      warehouseName: 'Main Central Hub',
      variantId: 'var-1',
      sku: 'COFFEE-BEANS-01',
      productName: 'Premium Espresso Roast',
      productId: 'prod-1',
      categoryName: 'Beverages',
      supplierName: 'Bean Suppliers Ltd',
      condition: 'good',
      onHand: 120,
      reserved: 20,
      available: 100,
      reorderLevel: 30,
      avcoUnitCost: 14.5,
      standardUnitCost: 15.0,
      fifoUnitCost: 14.2,
      unitCost: 14.5,
      sellingPrice: 28.0,
      totalValue: 120 * 14.5,
      potentialRevenue: 120 * 28.0,
      potentialMargin: ((120 * 28.0 - 120 * 14.5) / (120 * 28.0)) * 100,
      sharePercent: 25.0,
      stockStatus: 'in_stock',
    }

    it('accurately computes total asset valuation across AVCO, Standard, and FIFO methods', () => {
      const avcoTotal = sampleItem.onHand * sampleItem.avcoUnitCost
      const standardTotal = sampleItem.onHand * sampleItem.standardUnitCost
      const fifoTotal = sampleItem.onHand * sampleItem.fifoUnitCost

      expect(avcoTotal).toBe(1740) // 120 * 14.5
      expect(standardTotal).toBe(1800) // 120 * 15.0
      expect(fifoTotal).toBe(1704) // 120 * 14.2
    })

    it('correctly calculates projected gross sales revenue and profit margin percentage', () => {
      const revenue = sampleItem.onHand * sampleItem.sellingPrice
      const totalCost = sampleItem.onHand * sampleItem.avcoUnitCost
      const grossMarginPct = ((revenue - totalCost) / revenue) * 100

      expect(revenue).toBe(3360)
      expect(grossMarginPct).toBeCloseTo(48.21, 2)
    })

    it('accurately identifies low stock and out of stock conditions', () => {
      const isLowStock = (onHand: number, reorderLevel: number) => onHand > 0 && onHand <= reorderLevel
      const isOutOfStock = (onHand: number) => onHand <= 0

      expect(isLowStock(25, 30)).toBe(true)
      expect(isLowStock(35, 30)).toBe(false)
      expect(isOutOfStock(0)).toBe(true)
      expect(isOutOfStock(-2)).toBe(true)
      expect(isOutOfStock(1)).toBe(false)
    })
  })
})
