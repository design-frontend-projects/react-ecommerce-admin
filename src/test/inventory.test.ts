import { describe, it, expect } from 'vitest'
import { inventorySchema, type Inventory } from '../features/inventory/data/schema'

describe('Inventory Schema & Business Logic', () => {
  it('validates an inventory item with required product_variant_id and sku', () => {
    const input = {
      product_id: '1796a5fa-29f1-4cd5-96bf-16f7995aab05',
      product_variant_id: '23b60c46-c170-4059-a574-7d8f31903be3',
      sku: 'INV-TSHIRT-RED-L',
      barcode: '123456789012',
      quantity: 50,
      reorder_point: 10,
      min_quantity: 10,
      max_quantity: 100,
      last_count_date: '2026-09-08T20:00:00.000Z',
    }

    const result = inventorySchema.safeParse(input)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.product_variant_id).toBe('23b60c46-c170-4059-a574-7d8f31903be3')
      expect(result.data.sku).toBe('INV-TSHIRT-RED-L')
      expect(result.data.is_stockable).toBe(true)
      expect(result.data.is_sellable).toBe(true)
      expect(result.data.is_purchasable).toBe(true)
      expect(result.data.tracking_type).toBe('NONE')
      expect(result.data.status).toBe('ACTIVE')
      expect(result.data.quantity).toBe(50)
      expect(result.data.reorder_point).toBe(10)
    }
  })

  it('validates custom tracking policies and unit of measure', () => {
    const input = {
      product_variant_id: '23b60c46-c170-4059-a574-7d8f31903be3',
      sku: 'LOT-TRACK-001',
      tracking_type: 'LOT',
      unit_of_measure_id: 'uom-uuid-1234',
      is_stockable: true,
      is_sellable: false,
      is_purchasable: true,
      status: 'ACTIVE',
      quantity: 120,
      reorder_point: 20,
      max_quantity: 200,
    }

    const result = inventorySchema.safeParse(input)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.product_variant_id).toBe('23b60c46-c170-4059-a574-7d8f31903be3')
      expect(result.data.tracking_type).toBe('LOT')
      expect(result.data.is_sellable).toBe(false)
      expect(result.data.unit_of_measure_id).toBe('uom-uuid-1234')
      expect(result.data.quantity).toBe(120)
    }
  })

  it('fails validation when product_variant_id is empty or missing', () => {
    const input = {
      product_variant_id: '',
      sku: 'SKU-TEST',
      quantity: 10,
    }

    const result = inventorySchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('fails validation when sku is missing or empty', () => {
    const input = {
      product_variant_id: '23b60c46-c170-4059-a574-7d8f31903be3',
      sku: '',
      quantity: 10,
    }

    const result = inventorySchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('fails validation when quantity is negative', () => {
    const input = {
      product_variant_id: '23b60c46-c170-4059-a574-7d8f31903be3',
      sku: 'SKU-001',
      quantity: -5,
    }

    const result = inventorySchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('correctly categorizes stock status', () => {
    const calculateStatus = (item: Partial<Inventory>) => {
      const quantity = Number(item.quantity ?? 0)
      const minStock = item.reorder_point ?? item.min_quantity ?? item.reorder_level ?? 0
      const maxStock = item.max_quantity ?? item.max_stock_level

      if (quantity === 0) return 'Out of Stock'
      if (quantity <= minStock) return 'Low Stock'
      if (maxStock != null && quantity > maxStock) return 'Overstocked'
      return 'In Stock'
    }

    expect(calculateStatus({ quantity: 0, reorder_point: 10 })).toBe('Out of Stock')
    expect(calculateStatus({ quantity: 5, reorder_point: 10 })).toBe('Low Stock')
    expect(calculateStatus({ quantity: 10, reorder_point: 10 })).toBe('Low Stock')
    expect(calculateStatus({ quantity: 50, reorder_point: 10, max_quantity: 100 })).toBe('In Stock')
    expect(calculateStatus({ quantity: 150, reorder_point: 10, max_quantity: 100 })).toBe('Overstocked')
  })
})
