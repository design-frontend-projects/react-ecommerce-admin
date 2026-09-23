import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listBatches, setBatchStatus, expireBatches } from '@/server/fns/batches'
import prisma from '@/lib/prisma'

vi.mock('@/lib/prisma', () => ({
  default: {
    product_batches: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    product_variants: {
      findMany: vi.fn(),
    },
    suppliers: {
      findMany: vi.fn(),
    },
    stock_by_location: {
      groupBy: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}))

vi.mock('@/server/utils/tenant', () => ({
  requireTenantId: vi.fn().mockResolvedValue('tenant-test-id'),
  resolveTenantUserId: vi.fn().mockResolvedValue('user-tenant-id'),
}))

describe('listBatches server function', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('successfully fetches batches and joins variants, suppliers, and stock quantities', async () => {
    const mockBatches = [
      {
        id: 'batch-uuid-1',
        tenant_id: 'tenant-test-id',
        product_variant_id: 'var-1',
        batch_number: 'LOT-2026-001',
        supplier_id: 'sup-1',
        manufacture_date: new Date('2026-01-01'),
        expiry_date: new Date('2026-12-31'),
        unit_cost: { toString: () => '45.50' },
        status: 'active' as const,
        notes: 'First batch',
        created_at: new Date('2026-01-01T00:00:00Z'),
        updated_at: new Date('2026-01-01T00:00:00Z'),
      },
    ]

    const mockVariants = [
      {
        id: 'var-1',
        sku: 'SKU-COFFEE-01',
        barcode: '987654321',
        products: {
          name: 'Organic Coffee Beans',
        },
      },
    ]

    const mockSuppliers = [
      {
        id: 'sup-1',
        name: 'Arabica Traders Ltd',
      },
    ]

    const mockStockGroupBy = [
      {
        batch_id: 'batch-uuid-1',
        _sum: { qty_on_hand: 120 },
      },
    ]

    vi.mocked(prisma.product_batches.findMany).mockResolvedValue(
      mockBatches as unknown as Awaited<ReturnType<typeof prisma.product_batches.findMany>>
    )
    vi.mocked(prisma.product_variants.findMany).mockResolvedValue(
      mockVariants as unknown as Awaited<ReturnType<typeof prisma.product_variants.findMany>>
    )
    vi.mocked(prisma.suppliers.findMany).mockResolvedValue(
      mockSuppliers as unknown as Awaited<ReturnType<typeof prisma.suppliers.findMany>>
    )
    vi.mocked(prisma.stock_by_location.findMany).mockResolvedValue([
      {
        batch_id: 'batch-uuid-1',
        warehouse_id: 'wh-1',
        warehouse_location_id: 'loc-1',
        qty_on_hand: 120,
        qty_reserved: 0,
        condition: 'good',
        warehouses: { id: 'wh-1', name: 'Main WH', code: 'WH1' },
        warehouse_locations: {
          id: 'loc-1',
          location_code: 'A-01',
          aisle: 'A',
          shelf: '1',
        },
      },
    ] as any)

    const result = await listBatches('auth-user-1')

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      id: 'batch-uuid-1',
      batch_number: 'LOT-2026-001',
      unit_cost: 45.5,
      qty_on_hand: 120,
      product_variants: {
        id: 'var-1',
        sku: 'SKU-COFFEE-01',
        products: {
          name: 'Organic Coffee Beans',
        },
      },
      suppliers: {
        id: 'sup-1',
        name: 'Arabica Traders Ltd',
      },
    })
  })

  it('returns an empty array when no batches exist', async () => {
    vi.mocked(prisma.product_batches.findMany).mockResolvedValue([])

    const result = await listBatches('auth-user-1')

    expect(result).toEqual([])
    expect(prisma.product_variants.findMany).not.toHaveBeenCalled()
    expect(prisma.suppliers.findMany).not.toHaveBeenCalled()
  })
})

describe('setBatchStatus server function', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('allows toggling active batch to blocked', async () => {
    vi.mocked(prisma.product_batches.findFirst).mockResolvedValue(
      { status: 'active' } as unknown as Awaited<ReturnType<typeof prisma.product_batches.findFirst>>
    )
    vi.mocked(prisma.product_batches.update).mockResolvedValue(
      {
        id: 'batch-1',
        status: 'blocked',
      } as unknown as Awaited<ReturnType<typeof prisma.product_batches.update>>
    )

    const result = await setBatchStatus('auth-user-1', 'batch-1', 'blocked')
    expect(result).toEqual({ id: 'batch-1', status: 'blocked' })
    expect(prisma.product_batches.update).toHaveBeenCalledWith({
      where: { id: 'batch-1' },
      data: expect.objectContaining({
        status: 'blocked',
        updated_by_user_id: 'user-tenant-id',
      }),
    })
  })
})

describe('expireBatches server function', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates overdue batches to expired status', async () => {
    vi.mocked(prisma.product_batches.updateMany).mockResolvedValue(
      { count: 3 } as unknown as Awaited<ReturnType<typeof prisma.product_batches.updateMany>>
    )

    const result = await expireBatches('auth-user-1')
    expect(result).toEqual({ expired: 3 })
    expect(prisma.product_batches.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenant_id: 'tenant-test-id',
          status: 'active',
        }),
        data: expect.objectContaining({
          status: 'expired',
          updated_by_user_id: 'user-tenant-id',
        }),
      })
    )
  })
})
