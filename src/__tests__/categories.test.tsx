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

describe('Categories Module with Hierarchy and Arabic Support', () => {
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
    it('validates a valid category input with English and Arabic names', () => {
      const parsed = categoryInputSchema.safeParse({
        name: 'Hot Beverages',
        name_ar: 'المشروبات الساخنة',
        description: 'Warm coffees and teas',
        parent_id: '123e4567-e89b-12d3-a456-426614174000',
      })
      expect(parsed.success).toBe(true)
    })

    it('rejects empty category name', () => {
      const parsed = categoryInputSchema.safeParse({
        name: '',
      })
      expect(parsed.success).toBe(false)
    })

    it('validates a category list item with parent and counts', () => {
      const parsed = categoryListItemSchema.safeParse({
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Espresso',
        name_ar: 'إسبريسو',
        parent_id: '123e4567-e89b-12d3-a456-426614174001',
        parent: {
          id: '123e4567-e89b-12d3-a456-426614174001',
          name: 'Hot Beverages',
          name_ar: 'المشروبات الساخنة',
        },
        description: 'Handcrafted espresso shots',
        is_active: true,
        created_at: '2026-08-22T00:00:00.000Z',
        _count: {
          products: 12,
          children: 3,
        },
      })
      expect(parsed.success).toBe(true)
    })
  })

  describe('Server Functions', () => {
    it('listCategories filters by tenant_id and includes hierarchy relations', async () => {
      vi.mocked(prisma.categories.findMany).mockResolvedValue([
        {
          id: 'cat-1',
          tenant_id: mockTenantId,
          name: 'Hot Beverages',
          name_ar: 'المشروبات الساخنة',
          parent_id: null,
          description: null,
          is_active: true,
          created_at: new Date(),
          deleted_at: null,
          created_by_user_id: null,
          updated_by_user_id: null,
          parent: null,
          _count: { products: 0, children: 5 },
        },
      ])

      const result = await listCategories(mockUserId)
      expect(requireTenantId).toHaveBeenCalledWith(mockUserId)
      expect(prisma.categories.findMany).toHaveBeenCalledWith({
        where: {
          OR: [{ tenant_id: mockTenantId }, { tenant_id: null }],
        },
        orderBy: { name: 'asc' },
        include: {
          parent: {
            select: {
              id: true,
              name: true,
              name_ar: true,
            },
          },
          _count: {
            select: {
              products: true,
              children: true,
            },
          },
        },
      })
      expect(result).toHaveLength(1)
    })

    it('createCategory injects tenant_id, parent_id, and name_ar', async () => {
      vi.mocked(prisma.categories.create).mockResolvedValue({
        id: 'cat-1',
        tenant_id: mockTenantId,
        name: 'Specialty Coffee',
        name_ar: 'قهوة مختصة',
        parent_id: null,
        description: 'V60 and Chemex',
        is_active: true,
        created_at: new Date(),
        deleted_at: null,
        created_by_user_id: mockTenantUserId,
        updated_by_user_id: mockTenantUserId,
        parent: null,
        _count: { products: 0, children: 0 },
      })

      await createCategory(mockUserId, {
        name: 'Specialty Coffee',
        name_ar: 'قهوة مختصة',
        description: 'V60 and Chemex',
      })

      expect(prisma.categories.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenant_id: mockTenantId,
          name: 'Specialty Coffee',
          name_ar: 'قهوة مختصة',
          parent_id: null,
          description: 'V60 and Chemex',
          created_by_user_id: mockTenantUserId,
          updated_by_user_id: mockTenantUserId,
        }),
        include: expect.any(Object),
      })
    })

    it('updateCategory checks tenant isolation and prevents self-parenting', async () => {
      vi.mocked(prisma.categories.findFirst).mockResolvedValue({
        id: 'cat-1',
      } as any)

      // Test self-parenting rejection
      await expect(
        updateCategory(mockUserId, 'cat-1', {
          parentId: 'cat-1',
        })
      ).rejects.toThrow('A category cannot be its own parent.')

      // Test valid update
      vi.mocked(prisma.categories.update).mockResolvedValue({
        id: 'cat-1',
        tenant_id: mockTenantId,
        name: 'Updated Bakery',
        name_ar: 'مخبوزات محدثة',
        parent_id: null,
        description: null,
        is_active: true,
        created_at: new Date(),
        deleted_at: null,
        created_by_user_id: null,
        updated_by_user_id: mockTenantUserId,
        parent: null,
        _count: { products: 0, children: 0 },
      })

      await updateCategory(mockUserId, 'cat-1', {
        name: 'Updated Bakery',
        name_ar: 'مخبوزات محدثة',
      })

      expect(prisma.categories.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'cat-1',
          OR: [{ tenant_id: mockTenantId }, { tenant_id: null }],
        },
        select: { id: true },
      })
      expect(prisma.categories.update).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
        data: expect.objectContaining({
          name: 'Updated Bakery',
          name_ar: 'مخبوزات محدثة',
          updated_by_user_id: mockTenantUserId,
        }),
        include: expect.any(Object),
      })
    })

    it('deleteCategory blocks deletion if products are assigned', async () => {
      vi.mocked(prisma.categories.findFirst).mockResolvedValue({
        id: 'cat-1',
        _count: { products: 3, children: 0 },
      } as any)

      await expect(deleteCategory(mockUserId, 'cat-1')).rejects.toThrow(
        /assigned to 3 product\(s\)/
      )
    })

    it('deleteCategory blocks deletion if subcategories are assigned', async () => {
      vi.mocked(prisma.categories.findFirst).mockResolvedValue({
        id: 'cat-1',
        _count: { products: 0, children: 4 },
      } as any)

      await expect(deleteCategory(mockUserId, 'cat-1')).rejects.toThrow(
        /has 4 subcategory\(ies\)/
      )
    })
  })

  describe('Columns Definition', () => {
    it('generates columns definitions with hierarchy and Arabic support', () => {
      const columns = getColumns(mockT)
      expect(columns).toBeDefined()
      expect(columns.length).toBeGreaterThan(0)

      const nameCol = columns.find((c: any) => c.accessorKey === 'name')
      expect(nameCol).toBeDefined()

      const parentCol = columns.find((c: any) => c.id === 'parent')
      expect(parentCol).toBeDefined()

      const subCol = columns.find((c: any) => c.id === 'subcategories')
      expect(subCol).toBeDefined()

      const productsCol = columns.find((c: any) => c.id === 'products')
      expect(productsCol).toBeDefined()
    })
  })
})
