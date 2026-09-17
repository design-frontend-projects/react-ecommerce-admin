'use server'

import { ApiError } from '@/server/utils/api-error'
import { requireTenantId, resolveTenantUserId } from '@/server/utils/tenant'
import prisma from '@/lib/prisma'

export interface CreateCategoryInput {
  name: string
  name_ar?: string | null
  nameAr?: string | null
  parent_id?: string | null
  parentId?: string | null
  description?: string | null
  isActive?: boolean
  is_active?: boolean
}

export type UpdateCategoryInput = Partial<CreateCategoryInput>

function assertName(name: unknown): asserts name is string {
  if (typeof name !== 'string' || name.trim().length === 0) {
    throw new ApiError('A category name is required.', 400)
  }
}

export async function listCategories(authUserId: string) {
  const tenantId = await requireTenantId(authUserId)
  return prisma.categories.findMany({
    where: {
      OR: [{ tenant_id: tenantId }, { tenant_id: null }],
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
}

export async function createCategory(
  authUserId: string,
  input: CreateCategoryInput
) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)
  assertName(input.name)

  const parentId = input.parentId || input.parent_id || null
  if (parentId) {
    const parentExists = await prisma.categories.findFirst({
      where: { id: parentId, tenant_id: tenantId },
      select: { id: true },
    })
    if (!parentExists) {
      throw new ApiError('Parent category not found.', 400)
    }
  }

  const nameAr =
    input.nameAr !== undefined
      ? input.nameAr?.trim() || null
      : input.name_ar?.trim() || null

  return prisma.categories.create({
    data: {
      tenant_id: tenantId,
      name: input.name.trim(),
      name_ar: nameAr,
      parent_id: parentId,
      description: input.description?.trim() || null,
      is_active: input.isActive ?? input.is_active ?? true,
      created_by_user_id: tenantUserId,
      updated_by_user_id: tenantUserId,
    },
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
}

export async function updateCategory(
  authUserId: string,
  id: string,
  input: UpdateCategoryInput
) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)
  const existing = await prisma.categories.findFirst({
    where: {
      id,
      OR: [{ tenant_id: tenantId }, { tenant_id: null }],
    },
    select: { id: true },
  })
  if (!existing) {
    throw new ApiError('Category not found.', 404)
  }

  if (input.name !== undefined) {
    assertName(input.name)
  }

  const parentId =
    input.parentId !== undefined ? input.parentId : input.parent_id
  if (parentId) {
    if (parentId === id) {
      throw new ApiError('A category cannot be its own parent.', 400)
    }
    const parentExists = await prisma.categories.findFirst({
      where: {
        id: parentId,
        OR: [{ tenant_id: tenantId }, { tenant_id: null }],
      },
      select: { id: true },
    })
    if (!parentExists) {
      throw new ApiError('Parent category not found.', 400)
    }
  }

  const data: Record<string, any> = {
    updated_by_user_id: tenantUserId,
  }

  if (input.name !== undefined) data.name = input.name.trim()
  if (input.nameAr !== undefined) {
    data.name_ar = input.nameAr?.trim() || null
  } else if (input.name_ar !== undefined) {
    data.name_ar = input.name_ar?.trim() || null
  }

  if (parentId !== undefined) {
    data.parent_id = parentId || null
  }
  if (input.description !== undefined) {
    data.description = input.description?.trim() || null
  }
  if (input.isActive !== undefined) {
    data.is_active = input.isActive
  } else if (input.is_active !== undefined) {
    data.is_active = input.is_active
  }

  if (Object.keys(data).length <= 1) {
    throw new ApiError('No changes provided.', 400)
  }

  return prisma.categories.update({
    where: { id },
    data,
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
}

export async function deleteCategory(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  const existing = (await prisma.categories.findFirst({
    where: {
      id,
      OR: [{ tenant_id: tenantId }, { tenant_id: null }],
    },
    select: {
      id: true,
      _count: { select: { products: true, children: true } },
    },
  })) as { id: string; _count: { products: number; children?: number } } | null

  if (!existing) {
    throw new ApiError('Category not found.', 404)
  }
  if (existing._count.products > 0) {
    throw new ApiError(
      `This category is assigned to ${existing._count.products} product(s) and cannot be deleted.`,
      409
    )
  }
  if (existing._count.children && existing._count.children > 0) {
    throw new ApiError(
      `This category has ${existing._count.children} subcategory(ies). Please reassign or delete them first.`,
      409
    )
  }
  return prisma.categories.delete({ where: { id } })
}
