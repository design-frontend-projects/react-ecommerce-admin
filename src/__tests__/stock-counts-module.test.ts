import { describe, expect, it } from 'vitest'
import {
  createCountInputSchema,
  countEntryInputSchema,
  countListItemSchema,
  countItemRowSchema,
  countDetailSchema,
} from '@/features/stock-counts/data/schema'

describe('Stock Counts Module - Schemas & Validation', () => {
  it('validates a full warehouse count input correctly', () => {
    const validFullCount = {
      warehouseId: '896cd75e-67da-46ba-bcfe-22c5dac19929',
      scopeType: 'full',
      isBlind: false,
      notes: 'Quarterly full audit',
    }
    const result = createCountInputSchema.safeParse(validFullCount)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.warehouseId).toBe('896cd75e-67da-46ba-bcfe-22c5dac19929')
      expect(result.data.isBlind).toBe(false)
      expect(result.data.scopeType).toBe('full')
    }
  })

  it('validates a category-filtered cycle count with UUID categoryId', () => {
    const validCategoryCount = {
      warehouseId: '896cd75e-67da-46ba-bcfe-22c5dac19929',
      warehouseLocationId: '11111111-2222-4333-8444-555555555555',
      categoryId: '281e5cce-ef27-46d4-8a6a-664f4da0e7ad',
      scopeType: 'category',
      isBlind: true,
      notes: 'Cycle count for snacks & food',
    }
    const result = createCountInputSchema.safeParse(validCategoryCount)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.categoryId).toBe('281e5cce-ef27-46d4-8a6a-664f4da0e7ad')
      expect(result.data.isBlind).toBe(true)
    }
  })

  it('validates a targeted product & variants count input with UUID variant array', () => {
    const validVariantsCount = {
      warehouseId: '896cd75e-67da-46ba-bcfe-22c5dac19929',
      variantIds: [
        '33333333-4444-4555-8666-777777777777',
        '88888888-9999-4aaa-8bbb-cccccccccccc',
      ],
      scopeType: 'variants',
      isBlind: false,
    }
    const result = createCountInputSchema.safeParse(validVariantsCount)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.variantIds).toHaveLength(2)
      expect(result.data.variantIds?.[0]).toBe('33333333-4444-4555-8666-777777777777')
    }
  })

  it('rejects non-uuid values for categoryId and variantIds', () => {
    const invalidCategory = {
      warehouseId: '896cd75e-67da-46ba-bcfe-22c5dac19929',
      categoryId: 'not-a-uuid-12345',
    }
    expect(createCountInputSchema.safeParse(invalidCategory).success).toBe(false)

    const invalidVariants = {
      warehouseId: '896cd75e-67da-46ba-bcfe-22c5dac19929',
      variantIds: ['not-a-uuid'],
    }
    expect(createCountInputSchema.safeParse(invalidVariants).success).toBe(false)
  })

  it('validates countEntryInputSchema and rejects negative count numbers', () => {
    const validEntry = {
      itemId: '896cd75e-67da-46ba-bcfe-22c5dac19929',
      qtyCounted: 15.5,
    }
    expect(countEntryInputSchema.safeParse(validEntry).success).toBe(true)

    const negativeEntry = {
      itemId: '896cd75e-67da-46ba-bcfe-22c5dac19929',
      qtyCounted: -1,
    }
    expect(countEntryInputSchema.safeParse(negativeEntry).success).toBe(false)
  })

  it('validates countListItemSchema with joined category, warehouse and items count', () => {
    const countListItem = {
      id: '1c738e83-31fd-4444-a9ff-ec8feff64104',
      count_number: 'SC-000001',
      status: 'counting',
      warehouse_id: '896cd75e-67da-46ba-bcfe-22c5dac19929',
      store_id: null,
      warehouse_location_id: null,
      category_id: '281e5cce-ef27-46d4-8a6a-664f4da0e7ad',
      is_blind: false,
      snapshot_at: '2026-09-19T15:30:00.000Z',
      posted_at: null,
      posted_adjustment_id: null,
      notes: 'Test count',
      created_at: '2026-09-19T15:00:00.000Z',
      warehouses: {
        id: '896cd75e-67da-46ba-bcfe-22c5dac19929',
        name: 'Main Central Warehouse',
        code: 'WH-MAIN',
      },
      categories: {
        id: '281e5cce-ef27-46d4-8a6a-664f4da0e7ad',
        name: 'Crispy Wings & Finger Foods',
        name_ar: 'أجنحة دجاج مقرمشة ولقيمات',
      },
      _count: {
        stock_count_items: 24,
      },
    }

    const result = countListItemSchema.safeParse(countListItem)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.categories?.name).toBe('Crispy Wings & Finger Foods')
      expect(result.data._count?.stock_count_items).toBe(24)
    }
  })

  it('validates countDetailSchema and enriched item rows with variants and products', () => {
    const detailPayload = {
      id: '1c738e83-31fd-4444-a9ff-ec8feff64104',
      count_number: 'SC-000001',
      status: 'review',
      warehouse_id: '896cd75e-67da-46ba-bcfe-22c5dac19929',
      store_id: null,
      warehouse_location_id: null,
      category_id: null,
      is_blind: false,
      snapshot_at: '2026-09-19T15:30:00.000Z',
      posted_at: null,
      posted_adjustment_id: null,
      notes: null,
      created_at: '2026-09-19T15:00:00.000Z',
      stock_count_items: [
        {
          id: '22222222-3333-4444-5555-666666666666',
          product_variant_id: '33333333-4444-5555-6666-777777777777',
          warehouse_location_id: null,
          qty_snapshot: 10,
          qty_counted: 8,
          variance: -2,
          unit_cost: 15.5,
          counted_at: '2026-09-19T16:00:00.000Z',
          product_variants: {
            id: '33333333-4444-5555-6666-777777777777',
            sku: 'WINGS-BBQ-L',
            name: 'BBQ Wings Large',
            barcode: '628100001111',
            products: {
              id: '44444444-5555-6666-7777-888888888888',
              name: 'Crispy BBQ Wings',
              category_id: '281e5cce-ef27-46d4-8a6a-664f4da0e7ad',
            },
          },
        },
      ],
    }

    const rowResult = countItemRowSchema.safeParse(detailPayload.stock_count_items[0])
    expect(rowResult.success).toBe(true)

    const result = countDetailSchema.safeParse(detailPayload)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.stock_count_items[0].variance).toBe(-2)
      expect(result.data.stock_count_items[0].product_variants?.sku).toBe('WINGS-BBQ-L')
      expect(result.data.stock_count_items[0].product_variants?.products?.name).toBe('Crispy BBQ Wings')
    }
  })
})
