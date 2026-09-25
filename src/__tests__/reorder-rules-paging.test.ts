import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listRules } from '@/server/fns/reorder-rules'
import prisma from '@/lib/prisma'

vi.mock('@/lib/prisma', () => ({
  default: {
    reorder_rules: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/server/utils/tenant', () => ({
  requireTenantId: vi
    .fn()
    .mockResolvedValue('00000000-0000-0000-0000-000000000001'),
  resolveTenantUserId: vi
    .fn()
    .mockResolvedValue('00000000-0000-0000-0000-000000000002'),
}))

describe('reorder-rules server-side paging and filtering', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('paginates rules with default parameters and computes KPI metrics', async () => {
    const mockRules = [
      {
        id: 'rule-1',
        tenant_id: '00000000-0000-0000-0000-000000000001',
        product_variant_id: 'var-1',
        store_id: 'store-1',
        reorder_point: 25,
        min_qty: 10,
        max_qty: 100,
        safety_stock: 5,
        reorder_qty: 30,
        eoq: null,
        lead_time_days: 3,
        is_active: true,
        created_at: new Date('2026-09-25T12:00:00Z'),
        product_variants: {
          id: 'var-1',
          sku: 'SKU-001',
          barcode: '123456789',
          products: { name: 'Dark Roast Coffee' },
        },
        stores: { store_id: 'store-1', name: 'Downtown Branch' },
        suppliers: { id: 'sup-1', name: 'Coffee Beans Co' },
      },
    ]

    vi.mocked(prisma.$transaction).mockResolvedValue([
      mockRules, // items
      45, // totalFiltered
      50, // totalRules
      40, // activeRules
      10, // inactiveRules
      [{ store_id: 'store-1' }, { store_id: 'store-2' }], // distinctStores
    ] as any)

    const result = await listRules('user-1')

    expect(result.page).toBe(1)
    expect(result.pageSize).toBe(20)
    expect(result.total).toBe(45)
    expect(result.totalPages).toBe(3)
    expect(result.items).toHaveLength(1)
    expect(result.items[0].reorder_point).toBe(25)
    expect(result.metrics).toEqual({
      totalRules: 50,
      activeRules: 40,
      inactiveRules: 10,
      totalStores: 2,
    })
  })

  it('applies search filters across SKU, barcode, product name, and store name', async () => {
    vi.mocked(prisma.$transaction).mockResolvedValue([
      [],
      0,
      10,
      8,
      2,
      [],
    ] as any)

    await listRules('user-1', {
      search: 'espresso',
      page: 2,
      pageSize: 10,
    })

    expect(prisma.$transaction).toHaveBeenCalled()
    const findManyCall = vi.mocked(prisma.reorder_rules.findMany).mock.calls[0]?.[0]
    expect(findManyCall).toBeDefined()
    expect(findManyCall?.skip).toBe(10)
    expect(findManyCall?.take).toBe(10)
    expect(findManyCall?.where?.OR).toEqual([
      {
        product_variants: {
          sku: { contains: 'espresso', mode: 'insensitive' },
        },
      },
      {
        product_variants: {
          barcode: { contains: 'espresso', mode: 'insensitive' },
        },
      },
      {
        product_variants: {
          products: {
            name: { contains: 'espresso', mode: 'insensitive' },
          },
        },
      },
      {
        stores: {
          name: { contains: 'espresso', mode: 'insensitive' },
        },
      },
    ])
  })

  it('filters by storeId and isActive status', async () => {
    vi.mocked(prisma.$transaction).mockResolvedValue([
      [],
      0,
      5,
      5,
      0,
      [],
    ] as any)

    await listRules('user-1', {
      storeId: '00000000-0000-0000-0000-000000000099',
      isActive: true,
    })

    const findManyCall = vi.mocked(prisma.reorder_rules.findMany).mock.calls[0]?.[0]
    expect(findManyCall?.where?.store_id).toBe(
      '00000000-0000-0000-0000-000000000099'
    )
    expect(findManyCall?.where?.is_active).toBe(true)
  })

  it('applies sorting by column', async () => {
    vi.mocked(prisma.$transaction).mockResolvedValue([
      [],
      0,
      5,
      5,
      0,
      [],
    ] as any)

    await listRules('user-1', {
      sortBy: 'sku',
      sortOrder: 'asc',
    })

    const findManyCall = vi.mocked(prisma.reorder_rules.findMany).mock.calls[0]?.[0]
    expect(findManyCall?.orderBy).toEqual({
      product_variants: { sku: 'asc' },
    })
  })
})
