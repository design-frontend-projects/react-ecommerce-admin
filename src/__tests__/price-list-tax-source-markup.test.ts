import { describe, it, expect } from 'vitest'
import {
  normalizeTaxRate,
  getTaxRatePercentage,
  calculateTaxBreakdown,
  calculatePriceFromCostAndMarkup,
  calculateMarkupPercent,
} from '@/features/price-list/utils/pricing-calculator'
import {
  priceListItemFormSchema,
  priceListFormSchema,
  getPriceListItemFormSchema,
  getPriceListFormSchema,
} from '@/features/price-list/data/schema'

describe('Price List - Pricing Calculator Utility', () => {
  describe('normalizeTaxRate & getTaxRatePercentage', () => {
    it('normalizes percentage (14) to decimal ratio (0.14)', () => {
      expect(normalizeTaxRate(14)).toBeCloseTo(0.14)
      expect(normalizeTaxRate(100)).toBeCloseTo(1.0)
      expect(normalizeTaxRate(5)).toBeCloseTo(0.05)
    })

    it('handles rate already formatted as decimal ratio (0.14)', () => {
      expect(normalizeTaxRate(0.14)).toBeCloseTo(0.14)
      expect(normalizeTaxRate(0.05)).toBeCloseTo(0.05)
      expect(normalizeTaxRate(1)).toBeCloseTo(1.0)
    })

    it('handles null, undefined, or 0 cleanly', () => {
      expect(normalizeTaxRate(null)).toBe(0)
      expect(normalizeTaxRate(undefined)).toBe(0)
      expect(normalizeTaxRate(0)).toBe(0)
    })

    it('computes human-readable tax rate percentage', () => {
      expect(getTaxRatePercentage(14)).toBe(14)
      expect(getTaxRatePercentage(0.14)).toBe(14)
      expect(getTaxRatePercentage(5)).toBe(5)
      expect(getTaxRatePercentage(0.05)).toBe(5)
      expect(getTaxRatePercentage(0)).toBe(0)
      expect(getTaxRatePercentage(null)).toBe(0)
    })
  })

  describe('calculateTaxBreakdown', () => {
    it('calculates exclusive tax correctly (e.g. 100 + 14% tax = 114)', () => {
      const result = calculateTaxBreakdown(100, 14, false)
      expect(result.sellingPrice).toBe(100)
      expect(result.priceBeforeTax).toBe(100)
      expect(result.taxAmount).toBe(14)
      expect(result.priceAfterTax).toBe(114)
      expect(result.isInclusive).toBe(false)
      expect(result.taxRatePercent).toBe(14)
    })

    it('calculates inclusive tax correctly (e.g. 114 inclusive of 14% tax => 100 before tax, 14 tax)', () => {
      const result = calculateTaxBreakdown(114, 14, true)
      expect(result.sellingPrice).toBe(114)
      expect(result.priceBeforeTax).toBe(100)
      expect(result.taxAmount).toBe(14)
      expect(result.priceAfterTax).toBe(114)
      expect(result.isInclusive).toBe(true)
      expect(result.taxRatePercent).toBe(14)
    })

    it('handles decimal ratios (e.g. 0.15 inclusive on 115)', () => {
      const result = calculateTaxBreakdown(115, 0.15, true)
      expect(result.sellingPrice).toBe(115)
      expect(result.priceBeforeTax).toBe(100)
      expect(result.taxAmount).toBe(15)
      expect(result.priceAfterTax).toBe(115)
    })

    it('handles zero or null tax rate cleanly without NaN', () => {
      const result = calculateTaxBreakdown(50, null, false)
      expect(result.sellingPrice).toBe(50)
      expect(result.priceBeforeTax).toBe(50)
      expect(result.taxAmount).toBe(0)
      expect(result.priceAfterTax).toBe(50)
      expect(result.taxRatePercent).toBe(0)
    })
  })

  describe('calculatePriceFromCostAndMarkup', () => {
    it('calculates selling price from cost and markup percentage', () => {
      // Cost 50 + 20% markup = 60
      expect(calculatePriceFromCostAndMarkup(50, 20)).toBe(60)
      // Cost 100 + 50% markup = 150
      expect(calculatePriceFromCostAndMarkup(100, 50)).toBe(150)
      // Cost 33.33 + 15% markup = 38.33
      expect(calculatePriceFromCostAndMarkup(33.33, 15)).toBe(38.33)
    })

    it('returns cost unchanged when markup is 0 or undefined', () => {
      expect(calculatePriceFromCostAndMarkup(45, 0)).toBe(45)
      expect(calculatePriceFromCostAndMarkup(45, undefined)).toBe(45)
      expect(calculatePriceFromCostAndMarkup(45, null)).toBe(45)
    })

    it('returns 0 if cost is zero or negative', () => {
      expect(calculatePriceFromCostAndMarkup(0, 25)).toBe(0)
      expect(calculatePriceFromCostAndMarkup(-10, 25)).toBe(0)
    })
  })

  describe('calculateMarkupPercent', () => {
    it('calculates correct markup percentage from cost and selling price', () => {
      // Cost 50, Price 60 => 20% markup
      expect(calculateMarkupPercent(50, 60)).toBe(20)
      // Cost 100, Price 150 => 50% markup
      expect(calculateMarkupPercent(100, 150)).toBe(50)
    })

    it('returns 0 when cost is 0 or price equals cost', () => {
      expect(calculateMarkupPercent(0, 60)).toBe(0)
      expect(calculateMarkupPercent(50, 50)).toBe(0)
    })

    it('calculates negative markup if selling price is below cost', () => {
      expect(calculateMarkupPercent(100, 80)).toBe(-20)
    })
  })
})

describe('Price List - Schema Validation with Tax, Source & Markup', () => {
  const dummyT = (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue || key

  it('validates a price list item with tax_id, price_source, and markup_percent', () => {
    const itemData = {
      product_id: 'prod-001',
      product_variant_id: 'var-001',
      price: 120.0,
      cost_price: 100.0,
      min_price: 90.0,
      max_discount_percent: 15,
      tax_id: 'tax-vat-14',
      price_source: 'LAST_PURCHASE_COST' as const,
      markup_percent: 20.0,
    }

    const result = priceListItemFormSchema.safeParse(itemData)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.tax_id).toBe('tax-vat-14')
      expect(result.data.price_source).toBe('LAST_PURCHASE_COST')
      expect(result.data.markup_percent).toBe(20.0)
    }
  })

  it('validates a price list item with AVERAGE_COST price source', () => {
    const itemData = {
      product_id: 'prod-002',
      product_variant_id: 'var-002',
      price: 55.0,
      cost_price: 50.0,
      price_source: 'AVERAGE_COST' as const,
      markup_percent: 10,
    }

    const result = priceListItemFormSchema.safeParse(itemData)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.price_source).toBe('AVERAGE_COST')
      expect(result.data.markup_percent).toBe(10)
    }
  })

  it('defaults price_source to MANUAL if omitted', () => {
    const itemData = {
      product_id: 'prod-003',
      product_variant_id: 'var-003',
      price: 80.0,
    }

    const result = priceListItemFormSchema.safeParse(itemData)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.price_source).toBe('MANUAL')
      expect(result.data.tax_id).toBeUndefined()
      expect(result.data.markup_percent).toBe(0)
    }
  })

  it('validates header price list schema with default tax_id, price_source, and markup_percent', () => {
    const headerData = {
      name: 'Retail Price List 2026',
      code: 'RTL-2026',
      is_default: true,
      price_source: 'LAST_PURCHASE_COST' as const,
      tax_id: 'tax-rate-standard',
      markup_percent: 25.0,
      price: 125.0,
      start_date: '2026-01-01',
      items: [
        {
          product_id: 'prod-001',
          product_variant_id: 'var-001',
          price: 125.0,
          cost_price: 100.0,
          price_source: 'LAST_PURCHASE_COST' as const,
          tax_id: 'tax-rate-standard',
          markup_percent: 25.0,
        },
      ],
    }

    const result = priceListFormSchema.safeParse(headerData)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.tax_id).toBe('tax-rate-standard')
      expect(result.data.price_source).toBe('LAST_PURCHASE_COST')
      expect(result.data.markup_percent).toBe(25.0)
      expect(result.data.items?.[0].tax_id).toBe('tax-rate-standard')
    }
  })

  it('validates localized schemas correctly', () => {
    const itemSchema = getPriceListItemFormSchema(dummyT as any)
    const headerSchema = getPriceListFormSchema(dummyT as any)

    const validItem = {
      product_id: 'p1',
      product_variant_id: 'v1',
      price: 99.99,
      tax_id: 'tax-1',
      price_source: 'MANUAL' as const,
      markup_percent: 0,
    }
    const itemResult = itemSchema.safeParse(validItem)
    expect(itemResult.success).toBe(true)

    const validHeader = {
      name: 'Spring Promo',
      start_date: '2026-03-01',
      tax_id: 'tax-1',
      price_source: 'AVERAGE_COST' as const,
      markup_percent: 15,
      items: [validItem],
    }
    const headerResult = headerSchema.safeParse(validHeader)
    expect(headerResult.success).toBe(true)
  })

  describe('TaxRateBrief interface and label resolution', () => {
    it('supports tax_type with optional name fallback', () => {
      const standardRate = {
        id: 'tax-1',
        tax_type: 'VAT_15',
        rate: 15,
        is_inclusive: true,
      }
      expect(standardRate.tax_type || (standardRate as any).name).toBe('VAT_15')

      const legacyRateWithName = {
        id: 'tax-2',
        tax_type: '',
        name: 'Standard VAT',
        rate: 10,
        is_inclusive: false,
      }
      expect(legacyRateWithName.tax_type || legacyRateWithName.name).toBe('Standard VAT')
    })
  })
})
