import { describe, it, expect } from 'vitest'
import {
  SEED_LOOKUP_TYPES,
  type SeedLookupType,
} from '@/server/seed/lookups-seed'
import {
  lookupValueFormSchema,
  lookupTypeItemSchema,
  lookupValueItemSchema,
} from '@/features/lookups/data/schema'

describe('Lookup Master Data & Catalog Architecture', () => {
  describe('System Seed Definitions', () => {
    it('defines all 16 core lookup types', () => {
      expect(SEED_LOOKUP_TYPES.length).toBe(16)
      const codes = SEED_LOOKUP_TYPES.map((t: SeedLookupType) => t.code)
      expect(codes).toContain('address_type')
      expect(codes).toContain('uom_category')
      expect(codes).toContain('tax_classification')
      expect(codes).toContain('price_list_type')
      expect(codes).toContain('adjustment_reason')
      expect(codes).toContain('store_type')
      expect(codes).toContain('location_type')
      expect(codes).toContain('product_type')
      expect(codes).toContain('promotion_type')
      expect(codes).toContain('sales_channel')
      expect(codes).toContain('payment_status')
      expect(codes).toContain('return_reason')
      expect(codes).toContain('shipment_carrier')
      expect(codes).toContain('customer_type')
      expect(codes).toContain('supplier_category')
      expect(codes).toContain('warehouse_type')
    })

    it('each lookup type has valid default values and metadata', () => {
      for (const item of SEED_LOOKUP_TYPES) {
        expect(item.code).toBeTruthy()
        expect(item.name).toBeTruthy()
        expect(item.values.length).toBeGreaterThan(0)
        for (const val of item.values) {
          expect(val.code).toBeTruthy()
          expect(val.name).toBeTruthy()
        }
      }
    })
  })

  describe('Zod Validation Schemas', () => {
    it('validates a valid lookup type item', () => {
      const valid = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        code: 'adjustment_reason',
        name: 'Stock Adjustment Reason',
        description: 'Reasons for inventory stock changes',
        is_system: false,
        is_active: true,
        sort_order: 1,
        values_count: 10,
        custom_count: 2,
        system_count: 8,
      }
      expect(lookupTypeItemSchema.safeParse(valid).success).toBe(true)
    })

    it('validates a valid lookup value item with Arabic support', () => {
      const valid = {
        id: '123e4567-e89b-12d3-a456-426614174001',
        lookup_type_id: '123e4567-e89b-12d3-a456-426614174000',
        tenant_id: '123e4567-e89b-12d3-a456-426614174002',
        code: 'patient_return',
        name: 'Patient Return',
        name_ar: 'مرتجع مريض',
        description: 'Hospital patient returned medication',
        color: '#ef4444',
        icon: 'Undo2',
        metadata: { department: 'Pharmacy' },
        is_default: false,
        is_system: false,
        is_active: true,
        is_tenant_custom: true,
        sort_order: 1,
      }
      expect(lookupValueItemSchema.safeParse(valid).success).toBe(true)
    })

    it('validates lookup value form inputs with code formatting', () => {
      const validForm = {
        code: 'custom_store_hub',
        name: 'Cold Storage Hub',
        nameAr: 'مركز تخزين مبرد',
        description: 'Temperature controlled storage hub',
        color: '#06b6d4',
        icon: 'Snowflake',
        isDefault: false,
        isActive: true,
        sortOrder: 5,
      }
      expect(lookupValueFormSchema.safeParse(validForm).success).toBe(true)
    })

    it('rejects invalid codes with special characters', () => {
      const invalidForm = {
        code: 'invalid code with spaces!',
        name: 'Invalid Option',
        isDefault: false,
        isActive: true,
        sortOrder: 0,
      }
      expect(lookupValueFormSchema.safeParse(invalidForm).success).toBe(false)
    })
  })
})
