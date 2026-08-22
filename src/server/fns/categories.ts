'use server'

import { ApiError } from '@/server/utils/api-error'
import { requireTenantId, resolveTenantUserId } from '@/server/utils/tenant'
import prisma from '@/lib/prisma'

export interface CreateCategoryInput {
  name: string
  description?: string | null
  isActive?: boolean
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
    where: { tenant_id: tenantId },
    orderBy: { name: 'asc' },
    include: { _count: { select: { products: true } } },
  })
}

export async function createCategory(
  authUserId: string,
  input: CreateCategoryInput
) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)
  assertName(input.name)

  return prisma.categories.create({
    data: {
      tenant_id: tenantId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      is_active: input.isActive ?? true,
      created_by_user_id: tenantUserId,
      updated_by_user_id: tenantUserId,
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
    where: { id, tenant_id: tenantId },
    select: { id: true },
  })
  if (!existing) {
    throw new ApiError('Category not found.', 404)
  }

  if (input.name !== undefined) {
    assertName(input.name)
  }

  const data = {
    ...(input.name !== undefined ? { name: input.name.trim() } : {}),
    ...(input.description !== undefined
      ? { description: input.description?.trim() || null }
      : {}),
    ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
    updated_by_user_id: tenantUserId,
  }
  if (Object.keys(data).length === 0) {
    throw new ApiError('No changes provided.', 400)
  }

  return prisma.categories.update({ where: { id }, data })
}

export async function deleteCategory(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  const existing = (await prisma.categories.findFirst({
    where: { id, tenant_id: tenantId },
    select: { id: true, _count: { select: { products: true } } },
  })) as { id: string; _count: { products: number } } | null
  if (!existing) {
    throw new ApiError('Category not found.', 404)
  }
  if (existing._count.products > 0) {
    throw new ApiError(
      `This category is assigned to ${existing._count.products} product(s) and cannot be deleted.`,
      409
    )
  }
  return prisma.categories.delete({ where: { id } })
}
