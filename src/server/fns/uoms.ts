"use server"

import prisma from '@/lib/prisma'
import { ApiError } from '@/server/utils/api-error'
import { requireTenantId } from '@/server/utils/tenant'

const UOM_CATEGORIES = ['count', 'weight', 'volume', 'length', 'time'] as const
export type UomCategory = (typeof UOM_CATEGORIES)[number]

export interface CreateUomInput {
  code: string
  name: string
  uomCategory: UomCategory
  isBase?: boolean
}

export type UpdateUomInput = Partial<CreateUomInput> & { isActive?: boolean }

export interface CreateConversionInput {
  fromUomId: string
  toUomId: string
  factor: number
  productVariantId?: string | null
}

function assertRequiredText(value: unknown, message: string): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ApiError(message, 400)
  }
}

function assertCategory(category: unknown): asserts category is UomCategory {
  if (!UOM_CATEGORIES.includes(category as UomCategory)) {
    throw new ApiError('Invalid unit category.', 400)
  }
}

export async function listUoms(authUserId: string) {
  const tenantId = await requireTenantId(authUserId)
  return prisma.uoms.findMany({
    where: { tenant_id: tenantId },
    orderBy: { code: 'asc' },
    include: {
      _count: { select: { conversions_from: true, conversions_to: true } },
    },
  })
}

export async function createUom(authUserId: string, input: CreateUomInput) {
  const tenantId = await requireTenantId(authUserId)
  assertRequiredText(input.code, 'A unit code is required.')
  assertRequiredText(input.name, 'A unit name is required.')
  assertCategory(input.uomCategory)

  return prisma.uoms.create({
    data: {
      tenant_id: tenantId,
      auth_user_id: tenantId,
      code: input.code.trim(),
      name: input.name.trim(),
      uom_category: input.uomCategory,
      is_base: input.isBase ?? false,
    },
  })
}

export async function updateUom(
  authUserId: string,
  id: string,
  input: UpdateUomInput
) {
  const tenantId = await requireTenantId(authUserId)
  const existing = await prisma.uoms.findFirst({
    where: { id, tenant_id: tenantId },
    select: { id: true },
  })
  if (!existing) {
    throw new ApiError('Unit of measure not found.', 404)
  }

  if (input.code !== undefined) {
    assertRequiredText(input.code, 'A unit code is required.')
  }
  if (input.name !== undefined) {
    assertRequiredText(input.name, 'A unit name is required.')
  }
  if (input.uomCategory !== undefined) {
    assertCategory(input.uomCategory)
  }

  const data = {
    ...(input.code !== undefined ? { code: input.code.trim() } : {}),
    ...(input.name !== undefined ? { name: input.name.trim() } : {}),
    ...(input.uomCategory !== undefined
      ? { uom_category: input.uomCategory }
      : {}),
    ...(input.isBase !== undefined ? { is_base: input.isBase } : {}),
    ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
  }
  if (Object.keys(data).length === 0) {
    throw new ApiError('No changes provided.', 400)
  }

  return prisma.uoms.update({ where: { id }, data })
}

export async function deleteUom(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  const existing = (await prisma.uoms.findFirst({
    where: { id, tenant_id: tenantId },
    select: {
      id: true,
      _count: {
        select: {
          products: true,
          product_variants: true,
          conversions_from: true,
          conversions_to: true,
        },
      },
    },
  })) as {
    id: string
    _count: {
      products: number
      product_variants: number
      conversions_from: number
      conversions_to: number
    }
  } | null
  if (!existing) {
    throw new ApiError('Unit of measure not found.', 404)
  }

  const { products, product_variants, conversions_from, conversions_to } =
    existing._count
  if (products > 0 || product_variants > 0) {
    throw new ApiError(
      'This unit is referenced by products or variants and cannot be deleted.',
      409
    )
  }
  if (conversions_from > 0 || conversions_to > 0) {
    throw new ApiError(
      'This unit is used in unit conversions. Remove those conversions first.',
      409
    )
  }

  return prisma.uoms.delete({ where: { id } })
}

export async function listConversions(authUserId: string) {
  const tenantId = await requireTenantId(authUserId)
  return prisma.unit_conversions.findMany({
    where: { tenant_id: tenantId },
    orderBy: { created_at: 'desc' },
    include: {
      from_uom: { select: { id: true, code: true } },
      to_uom: { select: { id: true, code: true } },
      product_variants: { select: { id: true, sku: true } },
    },
  })
}

export async function createConversion(
  authUserId: string,
  input: CreateConversionInput
) {
  const tenantId = await requireTenantId(authUserId)

  if (!input.fromUomId || !input.toUomId) {
    throw new ApiError('Both a from unit and a to unit are required.', 400)
  }
  if (input.fromUomId === input.toUomId) {
    throw new ApiError('From and to units must differ.', 400)
  }
  if (
    typeof input.factor !== 'number' ||
    Number.isNaN(input.factor) ||
    input.factor <= 0
  ) {
    throw new ApiError('The conversion factor must be greater than zero.', 400)
  }

  const uomCount = await prisma.uoms.count({
    where: {
      id: { in: [input.fromUomId, input.toUomId] },
      tenant_id: tenantId,
    },
  })
  if (uomCount !== 2) {
    throw new ApiError('One or both units were not found.', 404)
  }

  return prisma.unit_conversions.create({
    data: {
      tenant_id: tenantId,
      auth_user_id: tenantId,
      from_uom_id: input.fromUomId,
      to_uom_id: input.toUomId,
      factor: input.factor,
      product_variant_id: input.productVariantId || null,
    },
  })
}

export async function deleteConversion(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  const existing = await prisma.unit_conversions.findFirst({
    where: { id, tenant_id: tenantId },
    select: { id: true },
  })
  if (!existing) {
    throw new ApiError('Conversion not found.', 404)
  }
  return prisma.unit_conversions.delete({ where: { id } })
}
