import { describe, it, expect, vi, beforeEach } from 'vitest'
import { supplierInputSchema } from '@/features/suppliers/data/schema'
import {
  listSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from '@/server/fns/suppliers'
import prisma from '@/lib/prisma'
import {
  requireTenantId,
  resolveTenantId,
  resolveTenantUserId,
} from '@/server/utils/tenant'

vi.mock('@/lib/prisma', () => ({
  default: {
    suppliers: {
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
  resolveTenantId: vi.fn(),
  resolveTenantUserId: vi.fn(),
  isValidUuid: (val: unknown) => typeof val === 'string' && val.length > 0,
}))

describe('Suppliers Schema & Server Functions', () => {
  const mockTenantId = '11111111-1111-1111-1111-111111111111'
  const mockTenantUserId = '22222222-2222-2222-2222-222222222222'
  const mockUserId = 'user-auth-123'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireTenantId).mockResolvedValue(mockTenantId)
    vi.mocked(resolveTenantId).mockResolvedValue(mockTenantId)
    vi.mocked(resolveTenantUserId).mockResolvedValue(mockTenantUserId)
  })

  describe('Validation Schema', () => {
    it('validates a valid supplier input', () => {
      const parsed = supplierInputSchema.safeParse({
        name: 'Acme Supplies',
        contactPerson: 'John Doe',
        email: 'john@acme.com',
        phone: '+1234567890',
        isPreferred: true,
      })
      expect(parsed.success).toBe(true)
    })

    it('rejects empty name', () => {
      const parsed = supplierInputSchema.safeParse({
        name: '',
      })
      expect(parsed.success).toBe(false)
    })
  })

  describe('Server Functions', () => {
    it('listSuppliers filters by tenant_id', async () => {
      vi.mocked(prisma.suppliers.findMany).mockResolvedValue([
        {
          id: 'sup-1',
          tenant_id: mockTenantId,
          name: 'Acme',
          _count: { products: 0, purchase_orders: 0 },
        } as any,
      ])

      const result = await listSuppliers(mockUserId)
      expect(resolveTenantId).toHaveBeenCalledWith(mockUserId)
      expect(prisma.suppliers.findMany).toHaveBeenCalledWith({
        where: { tenant_id: mockTenantId },
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: {
              products: true,
              purchase_orders: true,
            },
          },
        },
      })
      expect(result).toHaveLength(1)
    })

    it('createSupplier injects tenant_id and tenant user id', async () => {
      vi.mocked(prisma.suppliers.create).mockResolvedValue({
        id: 'sup-1',
        tenant_id: mockTenantId,
        name: 'New Supplier',
      } as any)

      await createSupplier(mockUserId, {
        name: 'New Supplier',
        contactPerson: 'Jane',
        isPreferred: true,
      })

      expect(prisma.suppliers.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenant_id: mockTenantId,
          name: 'New Supplier',
          contact_person: 'Jane',
          is_preferred: true,
          created_by_user_id: mockTenantUserId,
          updated_by_user_id: mockTenantUserId,
        }),
      })
    })

    it('updateSupplier checks tenant isolation', async () => {
      vi.mocked(prisma.suppliers.findFirst).mockResolvedValue({
        id: 'sup-1',
      } as any)
      vi.mocked(prisma.suppliers.update).mockResolvedValue({
        id: 'sup-1',
        name: 'Updated Name',
      } as any)

      await updateSupplier(mockUserId, 'sup-1', {
        name: 'Updated Name',
      })

      expect(prisma.suppliers.findFirst).toHaveBeenCalledWith({
        where: { id: 'sup-1', tenant_id: mockTenantId },
        select: { id: true },
      })
      expect(prisma.suppliers.update).toHaveBeenCalledWith({
        where: { id: 'sup-1' },
        data: expect.objectContaining({
          name: 'Updated Name',
          updated_by_user_id: mockTenantUserId,
        }),
      })
    })

    it('deleteSupplier blocks deletion if referenced by purchase orders', async () => {
      vi.mocked(prisma.suppliers.findFirst).mockResolvedValue({
        id: 'sup-1',
        _count: { purchase_orders: 2, products: 0 },
      } as any)

      await expect(deleteSupplier(mockUserId, 'sup-1')).rejects.toThrow(
        /referenced by 2 purchase order/
      )
    })
  })
})
