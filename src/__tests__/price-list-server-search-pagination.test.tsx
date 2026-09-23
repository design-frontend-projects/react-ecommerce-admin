import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  ProductVariantPickerDialog,
  type SelectedVariantItem,
} from '@/features/price-list/components/product-variant-picker-dialog'
import { calculateTaxBreakdown, calculateMarkupPercent, calculatePriceFromCostAndMarkup } from '@/features/price-list/utils/pricing-calculator'
import type { ProductBrief } from '@/features/price-list/data/schema'
import * as priceListHooks from '@/features/price-list/hooks/use-price-list'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue || key,
    i18n: { language: 'en' },
  }),
}))

describe('Price List Server Search & Pagination Enhancements', () => {
  describe('Pricing & Tax Calculations for Items', () => {
    it('calculates selling price correctly from cost and markup percentage', () => {
      // cost = 50, markup = 30% -> price = 50 * 1.30 = 65
      const price = calculatePriceFromCostAndMarkup(50, 30)
      expect(price).toBe(65)
    })

    it('calculates markup percentage from cost and selling price', () => {
      // cost = 50, price = 65 -> markup = (65 - 50) / 50 * 100 = 30%
      const markup = calculateMarkupPercent(50, 65)
      expect(markup).toBe(30)
    })

    it('calculates tax breakdown correctly for inclusive tax', () => {
      // Price = 115, Tax = 15% inclusive -> Before = 100, Tax Amount = 15, After = 115
      const breakdown = calculateTaxBreakdown(115, 15, true)
      expect(breakdown.priceAfterTax).toBe(115)
      expect(breakdown.priceBeforeTax).toBe(100)
      expect(breakdown.taxAmount).toBe(15)
    })

    it('calculates tax breakdown correctly for exclusive tax', () => {
      // Price = 100, Tax = 15% exclusive -> Before = 100, Tax Amount = 15, After = 115
      const breakdown = calculateTaxBreakdown(100, 15, false)
      expect(breakdown.priceBeforeTax).toBe(100)
      expect(breakdown.taxAmount).toBe(15)
      expect(breakdown.priceAfterTax).toBe(115)
    })
  })

  describe('In-Form Items Search & Pagination Slicing Logic', () => {
    const mockItems = [
      { product_name: 'Espresso Coffee Beans', variant_name: '1kg Bag', product_sku: 'COF-01', variant_sku: 'COF-01-1K', price: 20 },
      { product_name: 'Espresso Coffee Beans', variant_name: '500g Bag', product_sku: 'COF-01', variant_sku: 'COF-01-500', price: 12 },
      { product_name: 'Colombian Supremo', variant_name: '1kg Bag', product_sku: 'COF-02', variant_sku: 'COF-02-1K', price: 24 },
      { product_name: 'Colombian Supremo', variant_name: '250g Bag', product_sku: 'COF-02', variant_sku: 'COF-02-250', price: 8 },
      { product_name: 'Earl Grey Black Tea', variant_name: '100 Sachets', product_sku: 'TEA-01', variant_sku: 'TEA-01-100', price: 15 },
      { product_name: 'Green Jasmine Tea', variant_name: '50 Sachets', product_sku: 'TEA-02', variant_sku: 'TEA-02-50', price: 10 },
      { product_name: 'Vanilla Flavor Syrup', variant_name: '750ml Bottle', product_sku: 'SYR-01', variant_sku: 'SYR-01-750', price: 9 },
      { product_name: 'Caramel Flavor Syrup', variant_name: '750ml Bottle', product_sku: 'SYR-02', variant_sku: 'SYR-02-750', price: 9 },
    ]

    it('filters indices correctly based on search terms (product name, variant name, sku)', () => {
      const q = 'cof'
      const matched = mockItems
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => {
          const pName = (item.product_name || '').toLowerCase()
          const vName = (item.variant_name || '').toLowerCase()
          const pSku = (item.product_sku || '').toLowerCase()
          const vSku = (item.variant_sku || '').toLowerCase()
          return pName.includes(q) || vName.includes(q) || pSku.includes(q) || vSku.includes(q)
        })
        .map((x) => x.index)

      expect(matched).toEqual([0, 1, 2, 3])
      expect(matched.length).toBe(4)
    })

    it('slices items correctly for pagination', () => {
      const pageSize = 3
      const totalCount = mockItems.length
      const totalPages = Math.ceil(totalCount / pageSize)

      expect(totalPages).toBe(3)

      const page1 = mockItems.slice(0, 3)
      const page2 = mockItems.slice(3, 6)
      const page3 = mockItems.slice(6, 8)

      expect(page1.length).toBe(3)
      expect(page2.length).toBe(3)
      expect(page3.length).toBe(2)
      expect(page1[0].product_name).toBe('Espresso Coffee Beans')
      expect(page3[1].product_name).toBe('Caramel Flavor Syrup')
    })
  })

  describe('ProductVariantPickerDialog Component', () => {
    const mockProducts: ProductBrief[] = [
      {
        id: 'prod-1',
        name: 'Whole Bean Espresso',
        sku: 'WBE-001',
        cost_price: 10,
        regular_price: 18,
        product_variants: [
          {
            id: 'var-1a',
            product_id: 'prod-1',
            name: '500g Bag',
            sku: 'WBE-500G',
            barcode: '1111111111',
            price: 12,
            cost_price: 6,
          },
          {
            id: 'var-1b',
            product_id: 'prod-1',
            name: '1kg Bag',
            sku: 'WBE-1KG',
            barcode: '2222222222',
            price: 20,
            cost_price: 10,
          },
        ],
      },
      {
        id: 'prod-2',
        name: 'Organic Matcha Green Tea',
        sku: 'MTC-001',
        cost_price: 14,
        regular_price: 25,
        product_variants: [
          {
            id: 'var-2a',
            product_id: 'prod-2',
            name: '100g Tin',
            sku: 'MTC-100G',
            barcode: '3333333333',
            price: 25,
            cost_price: 14,
          },
        ],
      },
    ]

    beforeEach(() => {
      vi.spyOn(priceListHooks, 'useProductVariantSearch').mockReturnValue({
        data: {
          products: mockProducts,
          totalCount: 2,
          page: 1,
          pageSize: 10,
          totalPages: 1,
          variantCosts: {
            'var-1a': { lastPurchaseCost: 6.5, averageCost: 6.2 },
            'var-1b': { lastPurchaseCost: 10.5, averageCost: 10.1 },
            'var-2a': { lastPurchaseCost: 14.0, averageCost: 14.0 },
          },
        },
        isLoading: false,
        isFetching: false,
        isError: false,
      } as unknown as ReturnType<typeof priceListHooks.useProductVariantSearch>)
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('renders products and variants with cost badges and selection checkboxes', () => {
      const onAddItems = vi.fn()
      const onClose = vi.fn()

      render(
        <ProductVariantPickerDialog
          open={true}
          onClose={onClose}
          existingVariantIds={new Set(['var-1a'])} // var-1a is already added
          onAddItems={onAddItems}
        />
      )

      expect(screen.getByText('Whole Bean Espresso')).toBeDefined()
      expect(screen.getByText('Organic Matcha Green Tea')).toBeDefined()
      expect(screen.getByText('1kg Bag')).toBeDefined()
      // var-1a should show already in list
      expect(screen.getByText('In Price List')).toBeDefined()
    })

    it('allows selecting an unadded variant and submits it via onAddItems', () => {
      const onAddItems = vi.fn()
      const onClose = vi.fn()

      render(
        <ProductVariantPickerDialog
          open={true}
          onClose={onClose}
          existingVariantIds={new Set()}
          onAddItems={onAddItems}
        />
      )

      // Find the variant card for 1kg Bag (var-1b)
      const variantItem = screen.getByTestId('variant-item-var-1b')
      fireEvent.click(variantItem)

      // Click Add Selected Items button
      const addButton = screen.getByTestId('add-selected-items-btn')
      expect(addButton).toBeDefined()
      fireEvent.click(addButton)

      expect(onAddItems).toHaveBeenCalledTimes(1)
      const added = onAddItems.mock.calls[0][0]
      expect(added.length).toBe(1)
      expect(added[0].variant.id).toBe('var-1b')
      expect(added[0].product.id).toBe('prod-1')
      expect(added[0].product.name).toBe('Whole Bean Espresso')
      expect(added[0].variant.name).toBe('1kg Bag')
      expect(added[0].valuation?.lastPurchaseCost).toBe(10.5) // Uses the lastPurchaseCost from variantCosts
      expect(added[0].variant.price).toBe(20)
    })

    it('selects all available variants for a product when clicking Select All button', () => {
      const onAddItems = vi.fn()
      const onClose = vi.fn()

      render(
        <ProductVariantPickerDialog
          open={true}
          onClose={onClose}
          existingVariantIds={new Set()}
          onAddItems={onAddItems}
        />
      )

      // Click "Select All (2)" for Whole Bean Espresso
      const selectAllBtn = screen.getByTestId('select-all-prod-1')
      fireEvent.click(selectAllBtn)

      const addButton = screen.getByTestId('add-selected-items-btn')
      fireEvent.click(addButton)

      expect(onAddItems).toHaveBeenCalledTimes(1)
      const added = onAddItems.mock.calls[0][0]
      expect(added.length).toBe(2)
      expect(added.map((x: SelectedVariantItem) => x.variant.id)).toEqual(['var-1a', 'var-1b'])
    })
  })
})
