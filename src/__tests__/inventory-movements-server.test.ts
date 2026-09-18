import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listMovements } from '@/server/fns/inventory-movements'
import prisma from '@/lib/prisma'

vi.mock('@/lib/prisma', () => ({
  default: {
    inventory_movements: {
      findMany: vi.fn(),
    },
    product_variants: {
      findMany: vi.fn(),
    },
    warehouses: {
      findMany: vi.fn(),
    },
    stores: {
      findMany: vi.fn(),
    },
    branches: {
      findMany: vi.fn(),
    },
    warehouse_locations: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock('@/server/utils/tenant', () => ({
  requireTenantId: vi.fn().mockResolvedValue('tenant-123'),
}))

vi.mock('@/server/context/tenant-context', () => ({
  runWithTenantContext: vi.fn((_ctx, fn) => fn()),
}))

describe('listMovements server function', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('correctly maps raw prisma movement records with serialized numbers, dates, and qty_in/qty_out', async () => {
    const mockDbMovements = [
      {
        id: '457a95df-d9e8-4b7e-848f-7ebec10afe5e',
        movement_no: BigInt(1001),
        tenant_id: 'tenant-123',
        product_variant_id: 'var-1',
        warehouse_id: 'wh-1',
        store_id: null,
        branch_id: null,
        warehouse_location_id: 'loc-1',
        location_id: null,
        movement_type: 'adjustment_in',
        status: 'posted',
        condition: 'good',
        quantity_delta: 250,
        unit_cost: 45.5,
        total_cost: 11375,
        qty_before: 50,
        qty_after: 300,
        movement_date: new Date('2026-09-18T10:00:00.000Z'),
        occurred_at: new Date('2026-09-18T10:00:00.000Z'),
        created_at: new Date('2026-09-18T10:00:00.000Z'),
        reference_type: 'manual_adjustment',
        reference_id: 'ref-1',
        remarks: 'Restocked inventory',
      },
      {
        id: '557a95df-d9e8-4b7e-848f-7ebec10afe5f',
        movement_no: null,
        tenant_id: 'tenant-123',
        product_variant_id: 'var-1',
        warehouse_id: 'wh-1',
        store_id: null,
        branch_id: null,
        warehouse_location_id: null,
        location_id: null,
        movement_type: 'sale',
        status: 'posted',
        condition: 'good',
        quantity_delta: -30,
        unit_cost: 45.5,
        total_cost: 1365,
        qty_before: 300,
        qty_after: 270,
        movement_date: new Date('2026-09-18T11:00:00.000Z'),
        occurred_at: new Date('2026-09-18T11:00:00.000Z'),
        created_at: new Date('2026-09-18T11:00:00.000Z'),
        reference_type: 'sales_order',
        reference_id: 'order-1',
        remarks: 'Order dispatched',
      },
    ]

    vi.mocked(prisma.inventory_movements.findMany).mockResolvedValue(mockDbMovements as any)
    vi.mocked(prisma.product_variants.findMany).mockResolvedValue([
      { id: 'var-1', sku: 'SKU-001', barcode: 'BAR-001', name: 'Product A' } as any,
    ])
    vi.mocked(prisma.warehouses.findMany).mockResolvedValue([
      { id: 'wh-1', name: 'Central Warehouse', code: 'CWH' } as any,
    ])
    vi.mocked(prisma.stores.findMany).mockResolvedValue([])
    vi.mocked(prisma.branches.findMany).mockResolvedValue([])
    vi.mocked(prisma.warehouse_locations.findMany).mockResolvedValue([
      { id: 'loc-1', name: 'Aisle 1', code: 'A1' } as any,
    ])

    const results = await listMovements('user-1', {})

    expect(results).toHaveLength(2)

    // Check positive movement
    const pos = results[0]
    expect(pos.movement_no).toBe('1001') // BigInt serialized to string
    expect(pos.qty_in).toBe(250)
    expect(pos.qty_out).toBe(0)
    expect(pos.quantity_delta).toBe(250)
    expect(pos.qty).toBe(250)
    expect(pos.movement_date).toBe('2026-09-18T10:00:00.000Z')
    expect(pos.product_variants?.sku).toBe('SKU-001')
    expect(pos.warehouses?.name).toBe('Central Warehouse')
    expect(pos.warehouse_locations?.code).toBe('A1')

    // Check negative movement
    const neg = results[1]
    expect(neg.movement_no).toBeNull()
    expect(neg.qty_in).toBe(0)
    expect(neg.qty_out).toBe(30)
    expect(neg.quantity_delta).toBe(-30)
    expect(neg.qty).toBe(-30)
    expect(neg.movement_date).toBe('2026-09-18T11:00:00.000Z')
  })

  it('handles identical warehouseId and storeId via OR query', async () => {
    vi.mocked(prisma.inventory_movements.findMany).mockResolvedValue([])

    await listMovements('user-1', {
      warehouseId: 'loc-123',
      storeId: 'loc-123',
    })

    expect(prisma.inventory_movements.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenant_id: 'tenant-123',
          OR: [{ warehouse_id: 'loc-123' }, { store_id: 'loc-123' }],
        }),
      })
    )
  })
})
