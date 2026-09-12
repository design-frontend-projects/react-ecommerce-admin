import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  brandInputSchema,
  brandListItemSchema,
  brandListResponseSchema,
} from '@/features/brands/data/schema'
import {
  listBrands,
  createBrand,
  updateBrand,
  deleteBrand,
} from '@/server/fns/brands'
import prisma from '@/lib/prisma'
import { ApiError } from '@/server/utils/api-error'

vi.mock('@/lib/prisma', () => ({
  default: {
    brands: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

vi.mock('@/server/utils/tenant', () => ({
  resolveTenantUserId: vi.fn().mockResolvedValue('test-user-id'),
}))

describe('Brand Global Schemas', () => {
  it('validates brand input with Arabic name', () => {
    const validData = {
      name: 'Almarai',
      nameAr: 'المراعي',
      code: 'ALMARAI',
      logoUrl: 'https://logo.clearbit.com/almarai.com',
      description: 'Fresh dairy and juice products',
      isActive: true,
    }
    const parsed = brandInputSchema.parse(validData)
    expect(parsed.name).toBe('Almarai')
    expect(parsed.nameAr).toBe('المراعي')
  })

  it('allows optional/null Arabic name in brand input', () => {
    const dataWithoutAr = {
      name: 'Sony',
    }
    const parsed = brandInputSchema.parse(dataWithoutAr)
    expect(parsed.name).toBe('Sony')
    expect(parsed.nameAr).toBeUndefined()
  })

  it('rejects empty brand name', () => {
    expect(() => brandInputSchema.parse({ name: '' })).toThrow()
  })

  it('validates brand list item with name_ar', () => {
    const item = {
      id: 'd9e03d4a-58f8-45ad-bb5f-9fcfdb4b5001',
      name: 'Samsung',
      name_ar: 'سامسونج',
      code: 'SAMSUNG',
      logo_url: 'https://logo.clearbit.com/samsung.com',
      description: 'Consumer electronics',
      is_active: true,
      created_at: '2026-09-12T20:00:00.000Z',
      _count: { products: 12 },
    }
    const parsed = brandListItemSchema.parse(item)
    expect(parsed.name_ar).toBe('سامسونج')
    expect(parsed.id).toBe(item.id)

    const enveloped = brandListResponseSchema.parse({
      success: true,
      data: [parsed],
    })
    expect(enveloped.success).toBe(true)
    expect(enveloped.data[0].name_ar).toBe('سامسونج')
  })
})

describe('Brand Server Functions (Global Scope)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('listBrands queries all brands without tenant_id constraint', async () => {
    const mockList = [
      { id: '1', name: 'Almarai', name_ar: 'المراعي', _count: { products: 5 } },
      { id: '2', name: 'Apple', name_ar: 'أبل', _count: { products: 10 } },
    ]
    ;(prisma.brands.findMany as any).mockResolvedValue(mockList)

    const result = await listBrands()
    expect(prisma.brands.findMany).toHaveBeenCalledWith({
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    })
    expect(result).toEqual(mockList)
  })

  it('createBrand inserts global brand with name_ar', async () => {
    const mockCreated = {
      id: 'brand-uuid-1',
      name: 'Toyota',
      name_ar: 'تويوتا',
      code: 'TOYOTA',
      is_active: true,
    }
    ;(prisma.brands.create as any).mockResolvedValue(mockCreated)

    const result = await createBrand('auth-user-123', {
      name: 'Toyota',
      nameAr: 'تويوتا',
      code: 'TOYOTA',
    })

    expect(prisma.brands.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Toyota',
        name_ar: 'تويوتا',
        code: 'TOYOTA',
        is_active: true,
      }),
    })
    expect(result).toEqual(mockCreated)
  })

  it('updateBrand updates name_ar and fields', async () => {
    ;(prisma.brands.findUnique as any).mockResolvedValue({ id: 'brand-uuid-1' })
    ;(prisma.brands.update as any).mockResolvedValue({
      id: 'brand-uuid-1',
      name: 'Nike',
      name_ar: 'نايكي',
    })

    const result = await updateBrand('auth-user-123', 'brand-uuid-1', {
      nameAr: 'نايكي',
    })

    expect(prisma.brands.update).toHaveBeenCalledWith({
      where: { id: 'brand-uuid-1' },
      data: expect.objectContaining({
        name_ar: 'نايكي',
      }),
    })
    expect(result.name_ar).toBe('نايكي')
  })

  it('deleteBrand throws error if brand has products assigned', async () => {
    ;(prisma.brands.findUnique as any).mockResolvedValue({
      id: 'brand-uuid-1',
      _count: { products: 3 },
    })

    await expect(
      deleteBrand('auth-user-123', 'brand-uuid-1')
    ).rejects.toThrow(ApiError)
  })

  it('deleteBrand succeeds when no products are attached', async () => {
    ;(prisma.brands.findUnique as any).mockResolvedValue({
      id: 'brand-uuid-1',
      _count: { products: 0 },
    })
    ;(prisma.brands.delete as any).mockResolvedValue({ id: 'brand-uuid-1' })

    const result = await deleteBrand('auth-user-123', 'brand-uuid-1')
    expect(result).toEqual({ id: 'brand-uuid-1' })
  })
})
