'use server'

import { ApiError } from '@/server/utils/api-error'
import { requireTenantId } from '@/server/utils/tenant'
import prisma from '@/lib/prisma'

export interface CreateRuleInput {
  productVariantId: string
  storeId: string
  reorderPoint: number
  minQty?: number | null
  maxQty?: number | null
  safetyStock?: number | null
  reorderQty?: number | null
  eoq?: number | null
  leadTimeDays?: number | null
  preferredSupplierId?: number | null
  isActive?: boolean
}

export type UpdateRuleInput = Partial<CreateRuleInput>

const RULE_INCLUDE = {
  product_variants: {
    select: {
      id: true,
      sku: true,
      products: { select: { name: true } },
    },
  },
  stores: { select: { store_id: true, name: true } },
  suppliers: { select: { supplier_id: true, name: true } },
} as const

function assertReorderPoint(value: number): void {
  if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
    throw new ApiError('Reorder point must be a number >= 0.', 400)
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'P2002'
  )
}

export async function listRules(authUserId: string) {
  const tenantId = await requireTenantId(authUserId)
  return prisma.reorder_rules.findMany({
    where: { tenant_id: tenantId },
    orderBy: { created_at: 'desc' },
    include: RULE_INCLUDE,
  })
}

export async function createRule(authUserId: string, input: CreateRuleInput) {
  const tenantId = await requireTenantId(authUserId)

  if (!input.productVariantId) {
    throw new ApiError('A product variant is required.', 400)
  }
  if (!input.storeId) {
    throw new ApiError('A store is required.', 400)
  }
  assertReorderPoint(input.reorderPoint)

  try {
    return await prisma.reorder_rules.create({
      data: {
        tenant_id: tenantId,
        auth_user_id: tenantId,
        product_variant_id: input.productVariantId,
        store_id: input.storeId,
        reorder_point: input.reorderPoint,
        min_qty: input.minQty ?? null,
        max_qty: input.maxQty ?? null,
        safety_stock: input.safetyStock ?? 0,
        reorder_qty: input.reorderQty ?? null,
        eoq: input.eoq ?? null,
        lead_time_days: input.leadTimeDays ?? null,
        preferred_supplier_id: input.preferredSupplierId ?? null,
        is_active: input.isActive ?? true,
      },
      include: RULE_INCLUDE,
    })
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ApiError(
        'A rule for this variant and store already exists.',
        409
      )
    }
    throw error
  }
}

export async function updateRule(
  authUserId: string,
  id: string,
  input: UpdateRuleInput
) {
  const tenantId = await requireTenantId(authUserId)

  const existing = (await prisma.reorder_rules.findFirst({
    where: { id, tenant_id: tenantId },
    select: { id: true },
  })) as { id: string } | null
  if (!existing) {
    throw new ApiError('Reorder rule not found.', 404)
  }
  if (input.reorderPoint !== undefined) {
    assertReorderPoint(input.reorderPoint)
  }

  try {
    return await prisma.reorder_rules.update({
      where: { id },
      data: {
        ...(input.productVariantId !== undefined
          ? { product_variant_id: input.productVariantId }
          : {}),
        ...(input.storeId !== undefined ? { store_id: input.storeId } : {}),
        ...(input.reorderPoint !== undefined
          ? { reorder_point: input.reorderPoint }
          : {}),
        ...(input.minQty !== undefined ? { min_qty: input.minQty } : {}),
        ...(input.maxQty !== undefined ? { max_qty: input.maxQty } : {}),
        ...(input.safetyStock !== undefined
          ? { safety_stock: input.safetyStock ?? 0 }
          : {}),
        ...(input.reorderQty !== undefined
          ? { reorder_qty: input.reorderQty }
          : {}),
        ...(input.eoq !== undefined ? { eoq: input.eoq } : {}),
        ...(input.leadTimeDays !== undefined
          ? { lead_time_days: input.leadTimeDays }
          : {}),
        ...(input.preferredSupplierId !== undefined
          ? { preferred_supplier_id: input.preferredSupplierId }
          : {}),
        ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
      },
      include: RULE_INCLUDE,
    })
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ApiError(
        'A rule for this variant and store already exists.',
        409
      )
    }
    throw error
  }
}

export async function deleteRule(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)

  const existing = (await prisma.reorder_rules.findFirst({
    where: { id, tenant_id: tenantId },
    select: { id: true },
  })) as { id: string } | null
  if (!existing) {
    throw new ApiError('Reorder rule not found.', 404)
  }

  return prisma.reorder_rules.delete({ where: { id } })
}
