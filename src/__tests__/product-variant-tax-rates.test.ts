import { describe, it, expect } from 'vitest'
import {
  extractTaxRate,
  calculateLineTaxAmount,
  computeTaxPreview,
} from '@/features/sales-orders/utils/variant-stock'
import {
  productSchema,
  variantRowSchema,
  productVariantSchema,
} from '@/features/products/data/schema'

const MOCK_UUID_1 = '11111111-1111-4111-8111-111111111111'
const MOCK_UUID_2 = '22222222-2222-4222-8222-222222222222'
const MOCK_UUID_3 = '33333333-3333-4333-8333-333333333333'

describe('Product Variant Tax Rate Architecture', () => {
  describe('Zod Schema Verification', () => {
    it('should validate variantRowSchema with tax_rate_id and tax_rates', () => {
      const validVariantRow = {
        name: 'Standard 500g',
        sku: 'TEST-SKU-001',
        tax_rate_id: MOCK_UUID_1,
        tax_rates: {
          id: MOCK_UUID_1,
          tax_type: 'VAT_15',
          rate: 15,
          is_inclusive: false,
        },
      }

      const parsed = variantRowSchema.safeParse(validVariantRow)
      expect(parsed.success).toBe(true)
      if (parsed.success) {
        expect(parsed.data.tax_rate_id).toBe(MOCK_UUID_1)
        expect(parsed.data.tax_rates?.rate).toBe(15)
        expect(parsed.data.tax_rates?.tax_type).toBe('VAT_15')
      }
    })

    it('should validate productVariantSchema with nullable tax_rate_id', () => {
      const validVariant = {
        id: MOCK_UUID_1,
        product_id: MOCK_UUID_2,
        sku: 'VAR-SKU-1',
        name: 'Default Variant',
        tax_rate_id: null,
      }

      const parsed = productVariantSchema.safeParse(validVariant)
      expect(parsed.success).toBe(true)
      if (parsed.success) {
        expect(parsed.data.tax_rate_id).toBeNull()
      }
    })

    it('should not contain tax_code or tax_classification_id on base product', () => {
      const productInput = {
        id: MOCK_UUID_1,
        name: 'Premium Espresso',
        category_id: MOCK_UUID_3,
        sku: 'ESP-001',
        tax_code: 'VAT_15', // Should be ignored or stripped
        tax_classification_id: MOCK_UUID_2, // Should be ignored or stripped
      }

      const parsed = productSchema.safeParse(productInput)
      expect(parsed.success).toBe(true)
      if (parsed.success) {
        // Assert that tax_code and tax_classification_id are not recognized fields on the schema
        expect((parsed.data as any).tax_code).toBeUndefined()
        expect((parsed.data as any).tax_classification_id).toBeUndefined()
      }
    })
  })

  describe('Tax Resolution Engine', () => {
    const mockActiveTaxRates = [
      { id: 'rate-15', tax_type: 'VAT_15', rate: 15, is_active: true },
      { id: 'rate-5', tax_type: 'REDUCED_5', rate: 5, is_active: true },
      { id: 'rate-0', tax_type: 'ZERO', rate: 0, is_active: true },
    ]

    it('should resolve tax rate directly from variant tax_rates object', () => {
      const variantWithTaxRates = {
        tax_rate_id: 'rate-15',
        tax_rates: {
          id: 'rate-15',
          tax_type: 'VAT_15',
          rate: 15,
          is_inclusive: false,
        },
      }

      const result = extractTaxRate(variantWithTaxRates, mockActiveTaxRates)
      expect(result.source).toBe('variant_tax_rate')
      expect(result.taxRate).toBe(15)
      expect(result.taxType).toBe('VAT_15')
      expect(result.label).toBe('VAT_15 (15%)')
    })

    it('should resolve tax rate using variant tax_rate_id matched against tax_rates table', () => {
      const variantWithIdOnly = {
        tax_rate_id: 'rate-5',
      }

      const result = extractTaxRate(variantWithIdOnly, mockActiveTaxRates)
      expect(result.source).toBe('tax_rate_table')
      expect(result.taxRate).toBe(5)
      expect(result.taxType).toBe('REDUCED_5')
      expect(result.label).toBe('REDUCED_5 (5%)')
    })

    it('should calculate line tax amount accurately from variant tax rate', () => {
      // 3 items @ $50 each = $150. Discount $10 = Net $140. Tax 15% = $21.00
      const tax = calculateLineTaxAmount(3, 50, 10, 15)
      expect(tax).toBe(21)
    })

    it('should compute tax preview from variant tax rate correctly', () => {
      const variant = {
        tax_rate_id: 'rate-15',
        tax_rates: {
          id: 'rate-15',
          tax_type: 'VAT_15',
          rate: 15,
          is_inclusive: false,
        },
      }

      const preview = computeTaxPreview(variant, 2, 100, 20, mockActiveTaxRates)
      // Net: 2 * 100 - 20 = 180
      // Tax: 180 * 15% = 27
      // Gross: 180 + 27 = 207
      expect(preview.netAmount).toBe(180)
      expect(preview.calculatedTax).toBe(27)
      expect(preview.grossAmount).toBe(207)
      expect(preview.taxRatePercent).toBe(15)
      expect(preview.taxType).toBe('VAT_15')
      expect(preview.label).toBe('VAT_15 (15%)')
    })

    it('should fall back gracefully to legacy tax_code when variant tax is absent', () => {
      const legacyItem = {
        tax_code: 'VAT_15',
      }

      const result = extractTaxRate(legacyItem, mockActiveTaxRates)
      expect(result.taxRate).toBe(15)
      expect(result.source).toBe('tax_rate_table')
    })

    it('should return 0 tax when variant has no tax assigned', () => {
      const untaxedVariant = {
        tax_rate_id: null,
        tax_rates: null,
      }

      const result = extractTaxRate(untaxedVariant, mockActiveTaxRates)
      expect(result.source).toBe('none')
      expect(result.taxRate).toBe(0)
    })
  })
})
