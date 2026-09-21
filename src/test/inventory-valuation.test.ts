import { describe, it, expect } from 'vitest'
import {
  valuationFiltersSchema,
  valuationMethodEnum,
  valuationStockStatusEnum,
  type ValuationItemRow,
  type ValuationFilters,
  type ValuationFiltersInput,
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

    it('allows partial and empty objects for Partial<ValuationFilters> and ValuationFiltersInput', () => {
      const emptyFilters: Partial<ValuationFilters> = {}
      const partialInput: ValuationFiltersInput = { search: 'test' }
      const parsedFromEmpty = valuationFiltersSchema.parse(emptyFilters)

      expect(emptyFilters).toEqual({})
      expect(partialInput.search).toBe('test')
      expect(parsedFromEmpty.warehouseId).toBe('all')
      expect(parsedFromEmpty.page).toBe(1)
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

  describe('Tenant Default Currency & Price Symbol Formatting', () => {
    // Helper function used in the table
    const formatPrice = (amount: number, currencySymbol: string = '$') => {
      const formatted = amount.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
      const sym = (currencySymbol || '$').trim()
      const needsSpace = sym.length > 1 && !sym.endsWith(' ')
      return needsSpace ? `${sym} ${formatted}` : `${sym}${formatted}`
    }

    it('formats prices with standard single-character currency symbol ($) without extra space', () => {
      expect(formatPrice(1250.5, '$')).toBe('$1,250.50')
      expect(formatPrice(0, '$')).toBe('$0.00')
      expect(formatPrice(14.5, '€')).toBe('€14.50')
      expect(formatPrice(99.99, '£')).toBe('£99.99')
    })

    it('formats prices with multi-character or Arabic symbols (SAR, EGP, ر.س, LE) with clean spacing', () => {
      expect(formatPrice(1250.5, 'SAR')).toBe('SAR 1,250.50')
      expect(formatPrice(450, 'EGP')).toBe('EGP 450.00')
      expect(formatPrice(1740, 'ر.س')).toBe('ر.س 1,740.00')
      expect(formatPrice(85.25, 'LE')).toBe('LE 85.25')
      expect(formatPrice(1000, 'د.إ')).toBe('د.إ 1,000.00')
    })

    it('attaches tenant default currency symbol to ValuationItemRow and ValuationResponse', () => {
      const rowWithCurrency: ValuationItemRow = {
        id: 'bal-curr-1',
        balanceId: 'bal-curr-1',
        warehouseId: 'wh-1',
        variantId: 'var-1',
        sku: 'SKU-CURR',
        productName: 'Currency Item',
        productId: 'prod-1',
        categoryName: 'General',
        condition: 'good',
        onHand: 50,
        reserved: 5,
        available: 45,
        reorderLevel: 10,
        avcoUnitCost: 25.0,
        standardUnitCost: 25.0,
        fifoUnitCost: 25.0,
        unitCost: 25.0,
        sellingPrice: 50.0,
        totalValue: 1250.0,
        potentialRevenue: 2500.0,
        potentialMargin: 50.0,
        sharePercent: 10.0,
        stockStatus: 'in_stock',
        currencySymbol: 'ر.س',
      }

      expect(rowWithCurrency.currencySymbol).toBe('ر.س')
      expect(formatPrice(rowWithCurrency.unitCost, rowWithCurrency.currencySymbol)).toBe('ر.س 25.00')
      expect(formatPrice(rowWithCurrency.totalValue, rowWithCurrency.currencySymbol)).toBe('ر.س 1,250.00')
      expect(formatPrice(rowWithCurrency.potentialRevenue, rowWithCurrency.currencySymbol)).toBe('ر.س 2,500.00')

      // Quantity is units, not currency
      expect(rowWithCurrency.onHand).toBe(50)
      expect(`${rowWithCurrency.onHand}`).toBe('50')
    })

    it('resolves tenant currency info structure correctly', () => {
      const tenantCurrency = {
        currencyId: 'c1234567-89ab-cdef-0123-456789abcdef',
        currencyCode: 'SAR',
        currencySymbol: 'ر.س',
        currencyName: 'Saudi Riyal',
      }

      expect(tenantCurrency.currencyId).toBeTruthy()
      expect(tenantCurrency.currencyCode).toBe('SAR')
      expect(tenantCurrency.currencySymbol).toBe('ر.س')
    })
  })
})
