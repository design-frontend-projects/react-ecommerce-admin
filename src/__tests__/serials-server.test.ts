import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listSerials } from '@/server/fns/serials'
import prisma from '@/lib/prisma'

vi.mock('@/lib/prisma', () => ({
  default: {
    product_serials: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    product_variants: {
      findMany: vi.fn(),
    },
    stores: {
      findMany: vi.fn(),
    },
    product_batches: {
      findMany: vi.fn(),
    },
    inventory_movement_serials: {
      findMany: vi.fn(),
    },
    inventory_movements: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock('@/server/utils/tenant', () => ({
  requireTenantId: vi.fn().mockResolvedValue('tenant-test-id'),
}))

describe('listSerials server function', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('successfully fetches and maps serials with variants, stores, and batches', async () => {
    const mockSerials = [
      {
        id: '9fbb77f6-9509-4ce4-a82f-2d921b79f8ee',
        tenant_id: 'tenant-test-id',
        product_variant_id: 'var-1',
        batch_id: 'batch-1',
        serial_number: 'SN-1001',
        status: 'in_stock' as const,
        store_id: 'store-1',
        warehouse_location_id: null,
        unit_cost: { toString: () => '150.50' },
        received_at: new Date('2026-09-01T10:00:00Z'),
        sold_at: null,
        received_reference_type: 'goods_receipt',
        received_reference_id: null,
        last_reference_type: null,
        last_reference_id: null,
        warranty_until: null,
        notes: null,
        created_at: new Date('2026-09-01T10:00:00Z'),
        updated_at: new Date('2026-09-01T10:00:00Z'),
        created_by_user_id: null,
        updated_by_user_id: null,
      },
    ]

    const mockVariants = [
      {
        id: 'var-1',
        sku: 'SKU-ABC',
        barcode: '123456',
        products: {
          name: 'Premium Widget',
        },
      },
    ]

    const mockStores = [
      {
        store_id: 'store-1',
        name: 'Main Store',
      },
    ]

    const mockBatches = [
      {
        id: 'batch-1',
        batch_number: 'BATCH-2026-01',
      },
    ]

    vi.mocked(prisma.product_serials.findMany).mockResolvedValue(mockSerials as any)
    vi.mocked(prisma.product_variants.findMany).mockResolvedValue(mockVariants as any)
    vi.mocked(prisma.stores.findMany).mockResolvedValue(mockStores as any)
    vi.mocked(prisma.product_batches.findMany).mockResolvedValue(mockBatches as any)

    const result = await listSerials('user-1', { status: 'in_stock' })

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      id: '9fbb77f6-9509-4ce4-a82f-2d921b79f8ee',
      serial_number: 'SN-1001',
      status: 'in_stock',
      unit_cost: 150.5,
      product_variants: {
        id: 'var-1',
        sku: 'SKU-ABC',
        products: {
          name: 'Premium Widget',
        },
      },
      stores: {
        store_id: 'store-1',
        name: 'Main Store',
      },
      product_batches: {
        id: 'batch-1',
        batch_number: 'BATCH-2026-01',
      },
    })
  })

  it('returns an empty array when no serials are found', async () => {
    vi.mocked(prisma.product_serials.findMany).mockResolvedValue([])

    const result = await listSerials('user-1')

    expect(result).toEqual([])
    expect(prisma.product_variants.findMany).not.toHaveBeenCalled()
    expect(prisma.stores.findMany).not.toHaveBeenCalled()
    expect(prisma.product_batches.findMany).not.toHaveBeenCalled()
  })
})
