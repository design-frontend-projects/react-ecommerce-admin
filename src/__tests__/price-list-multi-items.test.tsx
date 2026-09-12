import { describe, it, expect } from 'vitest'
import {
  priceListItemFormSchema,
  priceListFormSchema,
  getPriceListItemFormSchema,
  getPriceListFormSchema,
} from '@/features/price-list/data/schema'

describe('Price List Multi-Item & Variant Schema', () => {
  const dummyT = (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue || key

  it('validates a valid price list item with product and variant', () => {
    const validItem = {
      product_id: 'prod-001',
      product_variant_id: 'var-001',
      price: 25.5,
      cost_price: 15.0,
      min_price: 20.0,
      max_discount_percent: 10,
      product_name: 'Espresso Blend',
      product_sku: 'COF-ESP',
      variant_name: '1kg Bag',
      variant_sku: 'COF-ESP-1KG',
      regular_price: 28.0,
    }

    const result = priceListItemFormSchema.safeParse(validItem)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.product_id).toBe('prod-001')
      expect(result.data.product_variant_id).toBe('var-001')
      expect(result.data.price).toBe(25.5)
      expect(result.data.cost_price).toBe(15.0)
    }
  })

  it('rejects item when product_id or product_variant_id is missing', () => {
    const missingProduct = {
      product_id: '',
      product_variant_id: 'var-001',
      price: 10,
    }
    const result1 = priceListItemFormSchema.safeParse(missingProduct)
    expect(result1.success).toBe(false)

    const missingVariant = {
      product_id: 'prod-001',
      product_variant_id: '',
      price: 10,
    }
    const result2 = priceListItemFormSchema.safeParse(missingVariant)
    expect(result2.success).toBe(false)
  })

  it('allows price list with multiple distinct products and variants', () => {
    const multiProductList = {
      name: 'Wholesale Standard Catalog 2026',
      code: 'WS-2026',
      is_default: false,
      start_date: '2026-01-01',
      end_date: '2026-12-31',
      is_active: true,
      items: [
        {
          product_id: 'prod-coffee',
          product_variant_id: 'var-coffee-500g',
          price: 14.0,
          cost_price: 8.0,
          min_price: 12.0,
          max_discount_percent: 5,
        },
        {
          product_id: 'prod-coffee',
          product_variant_id: 'var-coffee-1kg',
          price: 26.0,
          cost_price: 15.0,
          min_price: 22.0,
          max_discount_percent: 5,
        },
        {
          product_id: 'prod-tea',
          product_variant_id: 'var-tea-green',
          price: 9.5,
          cost_price: 4.5,
          min_price: 8.0,
          max_discount_percent: 10,
        },
        {
          product_id: 'prod-syrup',
          product_variant_id: 'var-syrup-vanilla',
          price: 12.0,
          cost_price: 6.0,
          min_price: 10.0,
          max_discount_percent: 15,
        },
      ],
    }

    const result = priceListFormSchema.safeParse(multiProductList)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.items.length).toBe(4)
      const distinctProducts = new Set(result.data.items.map((i) => i.product_id))
      expect(distinctProducts.size).toBe(3)
    }
  })

  it('rejects duplicate product variants in the same price list', () => {
    const listWithDuplicateVariants = {
      name: 'Duplicate Test List',
      start_date: '2026-01-01',
      is_active: true,
      items: [
        {
          product_id: 'prod-coffee',
          product_variant_id: 'var-coffee-1kg',
          price: 25.0,
        },
        {
          product_id: 'prod-tea',
          product_variant_id: 'var-tea-black',
          price: 8.0,
        },
        {
          product_id: 'prod-coffee',
          product_variant_id: 'var-coffee-1kg', // duplicate!
          price: 24.0,
        },
      ],
    }

    const result = priceListFormSchema.safeParse(listWithDuplicateVariants)
    expect(result.success).toBe(false)
    if (!result.success) {
      const errorPaths = (result.error.issues || []).map((e) => e.path.join('.'))
      expect(errorPaths).toContain('items')
    }
  })

  it('rejects end_date before start_date', () => {
    const invalidDates = {
      name: 'Invalid Dates List',
      start_date: '2026-05-10',
      end_date: '2026-05-01',
      is_active: true,
      items: [],
    }

    const result = priceListFormSchema.safeParse(invalidDates)
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = (result.error.issues || []).map((e) => e.path.join('.'))
      expect(paths).toContain('end_date')
    }
  })

  it('verifies localized schema produces localized error messages', () => {
    const schema = getPriceListFormSchema(dummyT)
    const result = schema.safeParse({
      name: '',
      start_date: '',
      items: [
        {
          product_id: '',
          product_variant_id: '',
          price: -5,
        },
      ],
    })

    expect(result.success).toBe(false)
  })

  it('allows header product_id to be omitted or empty in multi-product list', () => {
    const noHeaderProduct = {
      name: 'General Catalog List',
      product_id: null,
      start_date: '2026-01-01',
      is_active: true,
      items: [
        {
          product_id: 'prod-1',
          product_variant_id: 'var-1',
          price: 50,
        },
      ],
    }

    const result = priceListFormSchema.safeParse(noHeaderProduct)
    expect(result.success).toBe(true)
  })
})
