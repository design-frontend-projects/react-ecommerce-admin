import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getColumns } from '@/features/categories/components/categories-columns'
import {
  categoryInputSchema,
  categoryListItemSchema,
} from '@/features/categories/data/schema'
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '@/server/fns/categories'
import prisma from '@/lib/prisma'
import { requireTenantId, resolveTenantUserId } from '@/server/utils/tenant'

vi.mock('@/lib/prisma', () => ({
  default: {
    categories: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

vi.mock('@/server/utils/tenant', () => ({
  requireTenantId: vi.fn(),
  resolveTenantUserId: vi.fn(),
}))

describe('Categories Module', () => {
  const mockTenantId = '11111111-1111-1111-1111-111111111111'
  const mockTenantUserId = '22222222-2222-2222-2222-222222222222'
  const mockUserId = 'auth-user-123'
  const mockT = ((key: string) => key) as any

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireTenantId).mockResolvedValue(mockTenantId)
    vi.mocked(resolveTenantUserId).mockResolvedValue(mockTenantUserId)
  })

  describe('Validation Schemas', () => {
    it('validates a valid category input', () => {
      const parsed = categoryInputSchema.safeParse({
        name: 'Beverages',
        description: 'Hot and cold beverages',
      })
      expect(parsed.success).toBe(true)
    })

    it('rejects empty category name', () => {
      const parsed = categoryInputSchema.safeParse({
        name: '',
      })
      expect(parsed.success).toBe(false)
    })

    it('validates a category list item with UUID id', () => {
      const parsed = categoryListItemSchema.safeParse({
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Desserts',
        description: 'Sweet treats',
        is_active: true,
        created_at: '2026-08-22T00:00:00.000Z',
      })
      expect(parsed.success).toBe(true)
    })
  })

  describe('Server Functions', () => {
    it('listCategories filters by tenant_id', async () => {
      vi.mocked(prisma.categories.findMany).mockResolvedValue([
        {
          id: 'cat-1',
          tenant_id: mockTenantId,
          name: 'Beverages',
          description: null,
          is_active: true,
          created_at: new Date(),
          deleted_at: null,
          created_by_user_id: null,
          updated_by_user_id: null,
          _count: { products: 0 },
        },
      ])

      const result = await listCategories(mockUserId)
      expect(requireTenantId).toHaveBeenCalledWith(mockUserId)
      expect(prisma.categories.findMany).toHaveBeenCalledWith({
        where: { tenant_id: mockTenantId },
        orderBy: { name: 'asc' },
        include: { _count: { select: { products: true } } },
      })
      expect(result).toHaveLength(1)
    })

    it('createCategory injects tenant_id and tenant user id', async () => {
      vi.mocked(prisma.categories.create).mockResolvedValue({
        id: 'cat-1',
        tenant_id: mockTenantId,
        name: 'Bakery',
        description: 'Fresh bread',
        is_active: true,
        created_at: new Date(),
        deleted_at: null,
        created_by_user_id: mockTenantUserId,
        updated_by_user_id: mockTenantUserId,
      })

      await createCategory(mockUserId, {
        name: 'Bakery',
        description: 'Fresh bread',
      })

      expect(prisma.categories.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenant_id: mockTenantId,
          name: 'Bakery',
          description: 'Fresh bread',
          created_by_user_id: mockTenantUserId,
          updated_by_user_id: mockTenantUserId,
        }),
      })
    })

    it('updateCategory checks tenant isolation', async () => {
      vi.mocked(prisma.categories.findFirst).mockResolvedValue({
        id: 'cat-1',
      } as any)
      vi.mocked(prisma.categories.update).mockResolvedValue({
        id: 'cat-1',
        tenant_id: mockTenantId,
        name: 'Updated Bakery',
        description: null,
        is_active: true,
        created_at: new Date(),
        deleted_at: null,
        created_by_user_id: null,
        updated_by_user_id: mockTenantUserId,
      })

      await updateCategory(mockUserId, 'cat-1', {
        name: 'Updated Bakery',
      })

      expect(prisma.categories.findFirst).toHaveBeenCalledWith({
        where: { id: 'cat-1', tenant_id: mockTenantId },
        select: { id: true },
      })
      expect(prisma.categories.update).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
        data: expect.objectContaining({
          name: 'Updated Bakery',
          updated_by_user_id: mockTenantUserId,
        }),
      })
    })

    it('deleteCategory blocks deletion if products are assigned', async () => {
      vi.mocked(prisma.categories.findFirst).mockResolvedValue({
        id: 'cat-1',
        _count: { products: 3 },
      } as any)

      await expect(deleteCategory(mockUserId, 'cat-1')).rejects.toThrow(
        /assigned to 3 product\(s\)/
      )
    })
  })

  describe('Columns', () => {
    it('generates columns definitions with translations', () => {
      const columns = getColumns(mockT)
      expect(columns).toBeDefined()
      expect(columns.length).toBeGreaterThan(0)

      const nameCol = columns.find((c: any) => c.accessorKey === 'name')
      expect(nameCol).toBeDefined()
      expect((nameCol as any).header).toBe('categories.columns.name')
    })
  })
})
