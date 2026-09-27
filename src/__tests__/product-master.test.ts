import { describe, it, expect } from 'vitest'
import {
  productSchema,
  baseProductSchema,
  productSupplierSchema,
  attributeDefinitionSchema,
  attributeValueSchema,
  productVariantAttributeSchema,
  productMediaSchema,
  productWizardSchema,
} from '@/features/products/data/schema'

const MOCK_UUID_1 = '11111111-1111-4111-8111-111111111111'
const MOCK_UUID_2 = '22222222-2222-4222-8222-222222222222'
const MOCK_UUID_3 = '33333333-3333-4333-8333-333333333333'

describe('Product Master Enhancement', () => {
  describe('Schema Validation', () => {
    it('validates productSchema with new Product Master fields', () => {
      const validProduct = {
        name: 'Whole Milk 1L',
        name_ar: 'حليب كامل الدسم 1 لتر',
        product_code: 'PRD-000101',
        sku: 'MILK-1L',
        barcode: '6281001001001',
        short_description: 'Fresh pasteurized whole cow milk',
        description: 'Locally sourced 100% pure fresh cow milk with 3.5% fat.',
        category_id: MOCK_UUID_1,
        brand_id: MOCK_UUID_2,
        base_uom_id: MOCK_UUID_3,
        product_type: 'simple',
        tracking_mode: 'batch',
        is_stock_item: true,
        reorderable: true,
        is_batch_tracked: true,
        is_serial_tracked: false,
        is_active: true,
      }

      const parsed = productSchema.safeParse(validProduct)
      expect(parsed.success).toBe(true)
      if (parsed.success) {
        expect(parsed.data.product_code).toBe('PRD-000101')
        expect(parsed.data.name_ar).toBe('حليب كامل الدسم 1 لتر')
        expect(parsed.data.short_description).toBe('Fresh pasteurized whole cow milk')
        expect(parsed.data.is_batch_tracked).toBe(true)
      }
    })

    it('validates baseProductSchema with product_code and name_ar', () => {
      const baseData = {
        name: 'Arabica Coffee Beans 250g',
        name_ar: 'حبوب قهوة عربية 250 غرام',
        product_code: 'PRD-000202',
        sku: 'COF-ARA-250',
        barcode: '123456789012',
        short_description: 'Medium roast specialty beans',
        is_active: true,
      }

      const parsed = baseProductSchema.safeParse(baseData)
      expect(parsed.success).toBe(true)
      if (parsed.success) {
        expect(parsed.data.name_ar).toBe('حبوب قهوة عربية 250 غرام')
        expect(parsed.data.product_code).toBe('PRD-000202')
        expect(parsed.data.short_description).toBe('Medium roast specialty beans')
      }
    })

    it('validates productSupplierSchema for multi-supplier support', () => {
      const supplierLink = {
        id: MOCK_UUID_1,
        tenant_id: MOCK_UUID_2,
        product_id: MOCK_UUID_3,
        supplier_id: MOCK_UUID_1,
        supplier_product_code: 'SUP-COF-01',
        supplier_barcode: 'SUP-BAR-01',
        minimum_order_qty: 10,
        lead_time_days: 5,
        unit_cost: 14.5,
        is_preferred: true,
        is_active: true,
      }

      const parsed = productSupplierSchema.safeParse(supplierLink)
      expect(parsed.success).toBe(true)
      if (parsed.success) {
        expect(parsed.data.is_preferred).toBe(true)
        expect(parsed.data.unit_cost).toBe(14.5)
        expect(parsed.data.lead_time_days).toBe(5)
        expect(parsed.data.minimum_order_qty).toBe(10)
      }
    })

    it('validates attributeDefinitionSchema and attributeValueSchema', () => {
      const def = {
        id: MOCK_UUID_1,
        tenant_id: MOCK_UUID_2,
        code: 'COLOR',
        name: 'Color',
        name_ar: 'اللون',
        data_type: 'color',
        sort_order: 1,
        is_active: true,
      }
      const parsedDef = attributeDefinitionSchema.safeParse(def)
      expect(parsedDef.success).toBe(true)
      if (parsedDef.success) {
        expect(parsedDef.data.data_type).toBe('color')
      }

      const val = {
        id: MOCK_UUID_2,
        tenant_id: MOCK_UUID_2,
        attribute_definition_id: MOCK_UUID_1,
        value: 'Ruby Red',
        value_ar: 'أحمر ياقوتي',
        color_hex: '#E0115F',
        sort_order: 1,
        is_active: true,
      }
      const parsedVal = attributeValueSchema.safeParse(val)
      expect(parsedVal.success).toBe(true)
      if (parsedVal.success) {
        expect(parsedVal.data.color_hex).toBe('#E0115F')
      }

      const pva = {
        id: MOCK_UUID_3,
        tenant_id: MOCK_UUID_2,
        product_variant_id: MOCK_UUID_1,
        attribute_definition_id: MOCK_UUID_1,
        attribute_value_id: MOCK_UUID_2,
      }
      const parsedPva = productVariantAttributeSchema.safeParse(pva)
      expect(parsedPva.success).toBe(true)
    })

    it('validates productMediaSchema for media storage', () => {
      const media = {
        id: MOCK_UUID_1,
        tenant_id: MOCK_UUID_2,
        product_id: MOCK_UUID_3,
        storage_path: 'products/milk_1l.jpg',
        file_name: 'milk_1l.jpg',
        mime_type: 'image/jpeg',
        file_size: 1048576,
        alt_text: 'Bottle of whole milk 1 liter',
        is_primary: true,
        sort_order: 0,
        is_active: true,
      }

      const parsed = productMediaSchema.safeParse(media)
      expect(parsed.success).toBe(true)
      if (parsed.success) {
        expect(parsed.data.is_primary).toBe(true)
        expect(parsed.data.storage_path).toBe('products/milk_1l.jpg')
      }
    })

    it('validates productWizardSchema with base, variants, and suppliers', () => {
      const wizardData = {
        base: {
          name: 'Classic T-Shirt',
          name_ar: 'قميص كلاسيكي',
          product_code: 'PRD-000300',
          sku: 'TSHIRT-CLASSIC',
          is_active: true,
        },
        variants: [
          {
            sku: 'TSHIRT-RED-M',
            name: 'Red / M',
            price: 25,
            cost_price: 10,
            is_active: true,
          },
          {
            sku: 'TSHIRT-BLUE-L',
            name: 'Blue / L',
            price: 25,
            cost_price: 10,
            is_active: true,
          },
        ],
        suppliers: [
          {
            supplier_id: MOCK_UUID_1,
            unit_cost: 9.5,
            is_preferred: true,
            is_active: true,
          },
        ],
      }

      const parsed = productWizardSchema.safeParse(wizardData)
      expect(parsed.success).toBe(true)
      if (parsed.success) {
        expect(parsed.data.variants.length).toBe(2)
        expect(parsed.data.suppliers?.length).toBe(1)
      }
    })
  })
})
