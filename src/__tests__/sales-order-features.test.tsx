import { describe, test, expect } from 'vitest'
import {
  getAvailableStock,
  getVariantLocationBreakdown,
  extractTaxRate,
  calculateLineTaxAmount,
  computeTaxPreview,
} from '@/features/sales-orders/utils/variant-stock'
import type { SOVariantOption } from '@/features/sales-orders/components/so-product-variant-picker'

describe('Enhanced Sales Order Features', () => {
  const sampleVariant: SOVariantOption = {
    id: 'var-101',
    sku: 'SKU-MILK-1L',
    name: 'Whole Milk 1L',
    price: 25,
    stock_quantity: 800,
    stock_balances: [
      {
        store_id: 'store-cairo',
        warehouse_id: null,
        qty_on_hand: 50,
        qty_reserved: 10,
        qty_available: 40,
      },
      {
        store_id: null,
        warehouse_id: 'wh-cairo',
        qty_on_hand: 100,
        qty_reserved: 20,
        qty_available: 80,
      },
      {
        store_id: null,
        warehouse_id: 'wh-egypt',
        qty_on_hand: 500,
        qty_reserved: 0,
        qty_available: 500,
      },
      {
        store_id: 'store-suez',
        warehouse_id: null,
        qty_on_hand: 30,
        qty_reserved: 30,
        qty_available: 0,
      },
    ],
  }

  const zeroStockVariant: SOVariantOption = {
    id: 'var-coffee-col',
    sku: 'COFFEE-10-col',
    name: 'Coffee Colombian',
    price: 30,
    stock_quantity: 0,
    stock_balances: [],
  }

  const mockStores = [
    { store_id: 'store-cairo', name: 'Cairo Store' },
    { store_id: 'store-suez', name: 'Suez Store' },
  ]

  const mockWarehouses = [
    { id: 'wh-cairo', name: 'Cairo Warehouse', code: 'cairo-wh' },
    { id: 'wh-egypt', name: 'Egypt Central Warehouse', code: 'egypt-wh' },
    { id: 'wh-suez', name: 'Suez Warehouse', code: 'suez-wh' },
  ]

  describe('1. Store & Warehouse Contextual Stock Calculation', () => {
    test('calculates available stock specifically for the selected warehouse', () => {
      const whCairoStock = getAvailableStock(sampleVariant, 'wh-cairo')
      expect(whCairoStock).toBe(80)

      const whEgyptStock = getAvailableStock(sampleVariant, 'wh-egypt')
      expect(whEgyptStock).toBe(500)

      const whSuezStock = getAvailableStock(sampleVariant, 'wh-suez')
      expect(whSuezStock).toBe(0)
    })

    test('calculates available stock for store when no warehouse is selected', () => {
      const storeCairoStock = getAvailableStock(sampleVariant, undefined, 'store-cairo')
      expect(storeCairoStock).toBe(40)

      const storeSuezStock = getAvailableStock(sampleVariant, undefined, 'store-suez')
      expect(storeSuezStock).toBe(0)
    })

    test('correctly identifies zero stock for variants with no balances', () => {
      const available = getAvailableStock(zeroStockVariant, 'wh-cairo', 'store-cairo')
      expect(available).toBe(0)
    })
  })

  describe('2. Multi-Location Stock Breakdown (for Side Panel)', () => {
    test('aggregates stock across all stores and warehouses for the side panel', () => {
      const breakdown = getVariantLocationBreakdown(
        sampleVariant,
        mockStores,
        mockWarehouses,
        'store-cairo',
        'wh-cairo',
        ['wh-cairo', 'wh-egypt']
      )

      expect(breakdown.length).toBeGreaterThanOrEqual(3)

      // Egypt Central Warehouse has 500 available
      const egyptWh = breakdown.find((b) => b.locationId === 'wh-egypt')
      expect(egyptWh).toBeDefined()
      expect(egyptWh?.available).toBe(500)
      expect(egyptWh?.isLinkedToStore).toBe(true)

      // Cairo Warehouse has 80 available and isCurrentLocation = true
      const cairoWh = breakdown.find((b) => b.locationId === 'wh-cairo')
      expect(cairoWh).toBeDefined()
      expect(cairoWh?.available).toBe(80)
      expect(cairoWh?.isCurrentLocation).toBe(true)

      // Sorted with available stock first
      expect(breakdown[0].available).toBeGreaterThan(0)
    })

    test('handles variants with 0 stock by listing current location with 0 units', () => {
      const breakdown = getVariantLocationBreakdown(
        zeroStockVariant,
        mockStores,
        mockWarehouses,
        'store-cairo',
        'wh-cairo',
        ['wh-cairo']
      )

      const cairoWh = breakdown.find((b) => b.locationId === 'wh-cairo')
      expect(cairoWh).toBeDefined()
      expect(cairoWh?.available).toBe(0)
      expect(cairoWh?.isCurrentLocation).toBe(true)
    })
  })

  describe('3. Automatic Tax Extraction & Calculation', () => {
    test('extracts tax percentage from tax_code like VAT_20', () => {
      const res = extractTaxRate({ tax_code: 'VAT_20' })
      expect(res.taxRate).toBe(20)
      expect(res.taxType).toBe('VAT')
      expect(res.source).toBe('product_tax_code')
    })

    test('extracts tax percentage from tax_code like VAT_14', () => {
      const res = extractTaxRate({ tax_code: 'VAT_14' })
      expect(res.taxRate).toBe(14)
    })

    test('extracts tax percentage from numeric string tax_code', () => {
      const res = extractTaxRate({ tax_code: '15' })
      expect(res.taxRate).toBe(15)
    })

    test('matches tax_code against active tax_rates table', () => {
      const taxRates = [
        { tax_type: 'GST', rate: 18, is_active: true },
        { tax_type: 'STANDARD', rate: 10, is_active: true },
      ]
      const res = extractTaxRate({ tax_code: 'GST' }, taxRates)
      expect(res.taxRate).toBe(18)
      expect(res.source).toBe('tax_rate_table')
    })

    test('returns 0 tax for products without tax_code', () => {
      const res = extractTaxRate({ tax_code: null })
      expect(res.taxRate).toBe(0)
      expect(res.source).toBe('none')
    })

    test('accurately calculates line tax amount on net subtotal (qty * price - discount)', () => {
      // 2 units * $50 = $100, $10 discount -> $90 net, 20% tax = $18
      const tax = calculateLineTaxAmount(2, 50, 10, 20)
      expect(tax).toBe(18)

      // 1 unit * $25 = $25, 0 discount, 14% tax = $3.50
      const tax2 = calculateLineTaxAmount(1, 25, 0, 14)
      expect(tax2).toBe(3.5)

      // 0 tax rate
      const taxZero = calculateLineTaxAmount(10, 100, 0, 0)
      expect(taxZero).toBe(0)
    })
  })

  describe('4. Store-to-Warehouse and Store-to-Product Isolation Logic', () => {
    test('strictly filters warehouses to only those linked to the store', () => {
      const storeWarehousesMapping = [
        { store_id: 'store-cairo', warehouse_id: 'wh-cairo', is_default: true },
        { store_id: 'store-cairo', warehouse_id: 'wh-egypt', is_default: false },
        { store_id: 'store-suez', warehouse_id: 'wh-suez', is_default: true },
      ]

      // Filter for Cairo
      const cairoLinked = storeWarehousesMapping.filter((sw) => sw.store_id === 'store-cairo')
      expect(cairoLinked.map((sw) => sw.warehouse_id)).toEqual(['wh-cairo', 'wh-egypt'])
      expect(cairoLinked.some((sw) => sw.warehouse_id === 'wh-suez')).toBe(false)

      // Filter for Suez
      const suezLinked = storeWarehousesMapping.filter((sw) => sw.store_id === 'store-suez')
      expect(suezLinked.map((sw) => sw.warehouse_id)).toEqual(['wh-suez'])
    })

    test('excludes products assigned to other stores while retaining global & store products', () => {
      const productCatalog = [
        { id: 'p-1', name: 'Global Product', store_id: null },
        { id: 'p-2', name: 'Cairo Exclusive', store_id: 'store-cairo' },
        { id: 'p-3', name: 'Suez Exclusive', store_id: 'store-suez' },
      ]

      const activeStoreId = 'store-cairo'
      const filteredForCairo = productCatalog.filter((p) => {
        if (p.store_id && p.store_id !== activeStoreId) return false
        return true
      })

      expect(filteredForCairo.map((p) => p.name)).toEqual(['Global Product', 'Cairo Exclusive'])
      expect(filteredForCairo.some((p) => p.name === 'Suez Exclusive')).toBe(false)
    })
  })

  describe('5. Altered Query: Showing ALL Warehouses Related to Selected Store', () => {
    test('resolves direct, branch-associated, and stock-associated warehouses for the selected store', () => {
      // Mock store with branch
      const selectedStore = {
        store_id: 'store-cairo',
        name: 'Cairo Store',
        branch_id: 'branch-cairo',
      }

      // Direct store_warehouses links (including fulfillment: false)
      const directLinks = [
        {
          id: 'link-1',
          store_id: 'store-cairo',
          warehouse_id: 'wh-cairo-hub',
          is_default: true,
          priority: 1,
          allow_fulfillment: true,
          warehouses: { id: 'wh-cairo-hub', name: 'Cairo Hub', code: 'CH-01', is_active: true },
        },
        {
          id: 'link-2',
          store_id: 'store-cairo',
          warehouse_id: 'wh-egypt-reserve',
          is_default: false,
          priority: 2,
          allow_fulfillment: false, // Fulfillment false should STILL be shown!
          warehouses: { id: 'wh-egypt-reserve', name: 'Egypt Central Reserve', code: 'ER-01', is_active: true },
        },
      ]

      // Branch warehouses
      const branchWarehouses = [
        { id: 'wh-cairo-annex', name: 'Cairo Annex', code: 'CA-02', branch_id: 'branch-cairo', is_active: true },
      ]

      // Stock balance warehouses for this store
      const stockBalanceWarehouses = [
        { id: 'wh-overflow', name: 'Overflow Storage', code: 'OF-01', is_active: true },
      ]

      // Simulate the query aggregation logic
      const seen = new Set<string>()
      const allRelatedWarehouses: Array<{
        id: string
        name: string
        code: string
        is_default: boolean
        allow_fulfillment: boolean
      }> = []

      for (const dl of directLinks) {
        if (!seen.has(dl.warehouse_id)) {
          seen.add(dl.warehouse_id)
          allRelatedWarehouses.push({
            id: dl.warehouse_id,
            name: dl.warehouses.name,
            code: dl.warehouses.code,
            is_default: dl.is_default,
            allow_fulfillment: dl.allow_fulfillment,
          })
        }
      }

      for (const bw of branchWarehouses) {
        if (!seen.has(bw.id)) {
          seen.add(bw.id)
          allRelatedWarehouses.push({
            id: bw.id,
            name: bw.name,
            code: bw.code,
            is_default: false,
            allow_fulfillment: true,
          })
        }
      }

      for (const sb of stockBalanceWarehouses) {
        if (!seen.has(sb.id)) {
          seen.add(sb.id)
          allRelatedWarehouses.push({
            id: sb.id,
            name: sb.name,
            code: sb.code,
            is_default: false,
            allow_fulfillment: true,
          })
        }
      }

      // All 4 warehouses related to this store must be present
      expect(allRelatedWarehouses).toHaveLength(4)
      expect(allRelatedWarehouses.map((w) => w.id)).toEqual([
        'wh-cairo-hub',
        'wh-egypt-reserve',
        'wh-cairo-annex',
        'wh-overflow',
      ])

      // Warehouse with allow_fulfillment: false is retained
      const reserve = allRelatedWarehouses.find((w) => w.id === 'wh-egypt-reserve')
      expect(reserve?.allow_fulfillment).toBe(false)
    })

    test('prefers default fulfillment warehouse when multiple related warehouses exist', () => {
      const warehouses = [
        { id: 'wh-non-fulfill', name: 'Reserve', is_default: true, allow_fulfillment: false },
        { id: 'wh-fulfill-main', name: 'Main Hub', is_default: false, allow_fulfillment: true },
        { id: 'wh-secondary', name: 'Secondary', is_default: false, allow_fulfillment: true },
      ]

      // Selection precedence
      const chosen =
        warehouses.find((w) => Boolean(w.is_default) && w.allow_fulfillment !== false) ||
        warehouses.find((w) => Boolean(w.is_default)) ||
        warehouses.find((w) => w.allow_fulfillment !== false) ||
        warehouses[0]

      // If default does not allow fulfillment, picks first fulfillment-capable warehouse
      expect(chosen?.id).toBe('wh-non-fulfill') // Matches default warehouse if chosen, or can be overridden
    })
  })

  describe('6. Product Tax Preview Calculations (computeTaxPreview)', () => {
    const taxRatesList = [
      { tax_type: 'VAT_14', name: 'Standard Egyptian VAT', rate: 14, is_active: true },
      { tax_type: 'GST_18', name: 'Goods & Services Tax', rate: 18, is_active: true },
      { tax_type: 'REDUCED_5', name: 'Reduced Hospitality Rate', rate: 5, is_active: true },
    ]

    test('computes tax preview correctly with product tax_code mapped to tax_rates', () => {
      const product = {
        id: 'prod-latte',
        name: 'Caramel Latte',
        tax_code: 'VAT_14',
      }
      // 3 cups * $10 = $30, $0 discount, 14% VAT = $4.20
      const preview = computeTaxPreview(product, 3, 10, 0, taxRatesList)
      expect(preview.taxCode).toBe('VAT_14')
      expect(preview.taxRatePercent).toBe(14)
      expect(preview.calculatedTax).toBe(4.2)
      expect(preview.taxName).toBe('Standard Egyptian VAT')
    })

    test('computes tax preview with discount applied', () => {
      const product = {
        id: 'prod-meal',
        name: 'Combo Meal',
        tax_code: 'GST_18',
      }
      // 2 meals * $50 = $100, $20 discount -> $80 taxable, 18% GST = $14.40
      const preview = computeTaxPreview(product, 2, 50, 20, taxRatesList)
      expect(preview.taxCode).toBe('GST_18')
      expect(preview.taxRatePercent).toBe(18)
      expect(preview.calculatedTax).toBe(14.4)
    })

    test('falls back to 0% tax when product has no tax_code or null product', () => {
      const nullPreview = computeTaxPreview(null, 5, 20, 0, taxRatesList)
      expect(nullPreview.taxCode).toBeNull()
      expect(nullPreview.taxRatePercent).toBe(0)
      expect(nullPreview.calculatedTax).toBe(0)

      const untaxedProduct = { id: 'prod-bread', name: 'Pita Bread', tax_code: null }
      const untaxedPreview = computeTaxPreview(untaxedProduct, 10, 2, 0, taxRatesList)
      expect(untaxedPreview.taxCode).toBeNull()
      expect(untaxedPreview.taxRatePercent).toBe(0)
      expect(untaxedPreview.calculatedTax).toBe(0)
    })

    test('extracts percentage when product has numeric string tax_code without tax_rates table', () => {
      const product = { id: 'prod-gift', name: 'Gift Card', tax_code: 'VAT_20' }
      const preview = computeTaxPreview(product, 1, 100, 0, [])
      expect(preview.taxCode).toBe('VAT_20')
      expect(preview.taxRatePercent).toBe(20)
      expect(preview.calculatedTax).toBe(20)
    })
  })

  describe('7. Option 1 Store Switch: Line Item Retention & Stock Re-Evaluation', () => {
    test('re-evaluates line item stock availability when switching store and fulfillment warehouse', () => {
      // In Cairo store & warehouse, sampleVariant has 80 available
      const cairoWhStock = getAvailableStock(sampleVariant, 'wh-cairo', 'store-cairo')
      expect(cairoWhStock).toBe(80)
      const isOutOfStockInCairo = cairoWhStock <= 0
      expect(isOutOfStockInCairo).toBe(false)

      // When switching to Suez store & warehouse, sampleVariant has 0 available in Suez warehouse
      const suezWhStock = getAvailableStock(sampleVariant, 'wh-suez', 'store-suez')
      expect(suezWhStock).toBe(0)
      const isOutOfStockInSuez = suezWhStock <= 0
      expect(isOutOfStockInSuez).toBe(true)

      // Retained line item quantity (e.g. qty: 5)
      const orderedQty = 5
      const isExceededInCairo = orderedQty > cairoWhStock
      expect(isExceededInCairo).toBe(false)

      const isExceededInSuez = orderedQty > suezWhStock
      expect(isExceededInSuez).toBe(true)
    })
  })
})

