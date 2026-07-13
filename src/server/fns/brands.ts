"use server"

import prisma from '@/lib/prisma'
import { ApiError } from '@/server/utils/api-error'
import { requireTenantId } from '@/server/utils/tenant'

export interface CreateBrandInput {
  name: string
  code?: string | null
  logoUrl?: string | null
  description?: string | null
  isActive?: boolean
}

export type UpdateBrandInput = Partial<CreateBrandInput>

function assertName(name: unknown): asserts name is string {
  if (typeof name !== 'string' || name.trim().length === 0) {
    throw new ApiError('A brand name is required.', 400)
  }
}

export async function listBrands(authUserId: string) {
  const tenantId = await requireTenantId(authUserId)
  return prisma.brands.findMany({
    where: { tenant_id: tenantId },
    orderBy: { name: 'asc' },
    include: { _count: { select: { products: true } } },
  })
}

export async function createBrand(
  authUserId: string,
  input: CreateBrandInput
) {
  const tenantId = await requireTenantId(authUserId)
  assertName(input.name)

  return prisma.brands.create({
    data: {
      tenant_id: tenantId,
      auth_user_id: tenantId,
      name: input.name.trim(),
      code: input.code?.trim() || null,
      logo_url: input.logoUrl?.trim() || null,
      description: input.description?.trim() || null,
      is_active: input.isActive ?? true,
    },
  })
}

export async function updateBrand(
  authUserId: string,
  id: string,
  input: UpdateBrandInput
) {
  const tenantId = await requireTenantId(authUserId)
  const existing = await prisma.brands.findFirst({
    where: { id, tenant_id: tenantId },
    select: { id: true },
  })
  if (!existing) {
    throw new ApiError('Brand not found.', 404)
  }

  if (input.name !== undefined) {
    assertName(input.name)
  }

  const data = {
    ...(input.name !== undefined ? { name: input.name.trim() } : {}),
    ...(input.code !== undefined ? { code: input.code?.trim() || null } : {}),
    ...(input.logoUrl !== undefined
      ? { logo_url: input.logoUrl?.trim() || null }
      : {}),
    ...(input.description !== undefined
      ? { description: input.description?.trim() || null }
      : {}),
    ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
  }
  if (Object.keys(data).length === 0) {
    throw new ApiError('No changes provided.', 400)
  }

  return prisma.brands.update({ where: { id }, data })
}

export async function deleteBrand(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  const existing = (await prisma.brands.findFirst({
    where: { id, tenant_id: tenantId },
    select: { id: true, _count: { select: { products: true } } },
  })) as { id: string; _count: { products: number } } | null
  if (!existing) {
    throw new ApiError('Brand not found.', 404)
  }
  if (existing._count.products > 0) {
    throw new ApiError(
      `This brand is assigned to ${existing._count.products} product(s) and cannot be deleted.`,
      409
    )
  }
  return prisma.brands.delete({ where: { id } })
}
