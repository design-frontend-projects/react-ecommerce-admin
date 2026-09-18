import { describe, it, expect } from 'vitest'
import { movementsResponseSchema, movementRowSchema } from '@/features/inventory-movements/data/schema'

describe('inventory movements schema validation', () => {
  it('parses raw database movement records where qty_in and qty_out are derived from quantity_delta', () => {
    // This represents the raw database records returned by prisma.inventory_movements
    const rawDbMovement = {
      id: '457a95df-d9e8-4b7e-848f-7ebec10afe5e',
      movement_no: null,
      branch_id: null,
      store_id: '7dfd5989-5d16-4887-b99a-402fb2ef35ce',
      warehouse_id: null,
      location_id: null,
      warehouse_location_id: null,
      product_variant_id: 'f2cfe889-458b-4a51-aeb5-4d46aa34b49b',
      movement_type: 'adjustment_in',
      status: 'posted',
      condition: 'good',
      quantity_delta: 1000,
      unit_cost: 30,
      total_cost: 30000,
      reference_type: 'manual_adjustment',
      reference_id: '74f3cd17-ddc1-4c06-ba3a-fdf135d1cc1b',
      occurred_at: '2026-09-11T21:01:22.367Z',
      movement_date: '2026-09-11T21:01:22.367Z',
      batch_id: null,
      serial_id: null,
      reversed_movement_id: null,
      dest_store_id: null,
      dest_warehouse_location_id: null,
      idempotency_key: null,
      movement_group_id: null,
      qty_after: 1000,
      qty_before: 0,
      reason_code: 'other',
      source_document_id: null,
      source_document_type: null,
      remarks: 'add new quantity',
      notes: null,
      product_variants: { id: 'f2cfe889-458b-4a51-aeb5-4d46aa34b49b', sku: 'SKU-TEST' },
      warehouses: null,
      stores: { store_id: '7dfd5989-5d16-4887-b99a-402fb2ef35ce', name: 'Main Store' },
      branches: null,
    }

    const payload = {
      success: true,
      data: [rawDbMovement],
    }

    const parsed = movementsResponseSchema.parse(payload)
    expect(parsed.success).toBe(true)
    expect(parsed.data[0].qty_in).toBe(1000)
    expect(parsed.data[0].qty_out).toBe(0)
    expect(parsed.data[0].quantity_delta).toBe(1000)
  })

  it('correctly assigns qty_out when quantity_delta is negative', () => {
    const rawOutMovement = {
      id: '557a95df-d9e8-4b7e-848f-7ebec10afe5f',
      movement_type: 'sale',
      quantity_delta: -25,
      unit_cost: 15,
      total_cost: 375,
      movement_date: '2026-09-12T10:00:00.000Z',
      product_variant_id: 'f2cfe889-458b-4a51-aeb5-4d46aa34b49b',
    }

    const parsed = movementRowSchema.parse(rawOutMovement)
    expect(parsed.qty_in).toBe(0)
    expect(parsed.qty_out).toBe(25)
    expect(parsed.quantity_delta).toBe(-25)
  })

  it('handles already populated qty_in and qty_out without nan errors', () => {
    const rawMovementWithExplicitQty = {
      id: '657a95df-d9e8-4b7e-848f-7ebec10afe50',
      movement_type: 'purchase',
      qty_in: 50,
      qty_out: 0,
      quantity_delta: 50,
      unit_cost: 10,
      total_cost: 500,
      movement_date: '2026-09-12T10:00:00.000Z',
      product_variant_id: 'f2cfe889-458b-4a51-aeb5-4d46aa34b49b',
    }

    const parsed = movementRowSchema.parse(rawMovementWithExplicitQty)
    expect(parsed.qty_in).toBe(50)
    expect(parsed.qty_out).toBe(0)
  })

  it('handles Date instances for movement_date and undefined optional fields', () => {
    const rawMovement = {
      id: '757a95df-d9e8-4b7e-848f-7ebec10afe51',
      movement_type: 'adjustment_in',
      quantity_delta: '10',
      unit_cost: null,
      total_cost: undefined,
      movement_date: new Date('2026-09-15T00:00:00.000Z'),
      product_variant_id: 'f2cfe889-458b-4a51-aeb5-4d46aa34b49b',
    }

    const parsed = movementRowSchema.parse(rawMovement)
    expect(parsed.qty_in).toBe(10)
    expect(parsed.qty_out).toBe(0)
    expect(parsed.unit_cost).toBe(0)
    expect(parsed.total_cost).toBe(0)
    expect(parsed.movement_date).toBe('2026-09-15T00:00:00.000Z')
  })
})
