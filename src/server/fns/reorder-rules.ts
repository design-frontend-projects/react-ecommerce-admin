'use server'

import type { Prisma } from '@/generated/prisma/client'
import { ApiError } from '@/server/utils/api-error'
import { requireTenantId, resolveTenantUserId } from '@/server/utils/tenant'
import prisma from '@/lib/prisma'

export interface ListRulesFilters {
  page?: number
  pageSize?: number
  search?: string
  storeId?: string
  isActive?: boolean
  sortBy?:
    | 'created_at'
    | 'reorder_point'
    | 'safety_stock'
    | 'min_qty'
    | 'max_qty'
    | 'lead_time_days'
    | 'sku'
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedRulesResult {
  items: Array<Record<string, unknown>>
  total: number
  page: number
  pageSize: number
  totalPages: number
  metrics: {
    totalRules: number
    activeRules: number
    inactiveRules: number
    totalStores: number
  }
}

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
  preferredSupplierId?: string | null
  isActive?: boolean
}

export type UpdateRuleInput = Partial<CreateRuleInput>

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

export async function listRules(
  authUserId: string,
  filters: ListRulesFilters = {}
): Promise<PaginatedRulesResult> {
  const tenantId = await requireTenantId(authUserId)

  const pageSize = Math.min(Math.max(1, filters.pageSize ?? 20), 100)
  const page = Math.max(1, filters.page ?? 1)
  const skip = (page - 1) * pageSize

  const where: Prisma.reorder_rulesWhereInput = {
    tenant_id: tenantId,
  }

  if (filters.storeId) {
    where.store_id = filters.storeId
  }

  if (typeof filters.isActive === 'boolean') {
    where.is_active = filters.isActive
  }

  const trimmedSearch = filters.search?.trim()
  if (trimmedSearch) {
    where.OR = [
      {
        product_variants: {
          sku: { contains: trimmedSearch, mode: 'insensitive' },
        },
      },
      {
        product_variants: {
          barcode: { contains: trimmedSearch, mode: 'insensitive' },
        },
      },
      {
        product_variants: {
          products: {
            name: { contains: trimmedSearch, mode: 'insensitive' },
          },
        },
      },
      {
        stores: {
          name: { contains: trimmedSearch, mode: 'insensitive' },
        },
      },
    ]
  }

  const sortOrder = filters.sortOrder === 'asc' ? 'asc' : 'desc'
  let orderBy: Prisma.reorder_rulesOrderByWithRelationInput = {
    created_at: sortOrder,
  }

  if (filters.sortBy === 'reorder_point') {
    orderBy = { reorder_point: sortOrder }
  } else if (filters.sortBy === 'safety_stock') {
    orderBy = { safety_stock: sortOrder }
  } else if (filters.sortBy === 'min_qty') {
    orderBy = { min_qty: sortOrder }
  } else if (filters.sortBy === 'max_qty') {
    orderBy = { max_qty: sortOrder }
  } else if (filters.sortBy === 'lead_time_days') {
    orderBy = { lead_time_days: sortOrder }
  } else if (filters.sortBy === 'sku') {
    orderBy = { product_variants: { sku: sortOrder } }
  } else if (filters.sortBy === 'created_at') {
    orderBy = { created_at: sortOrder }
  }

  const [
    items,
    totalFiltered,
    totalRules,
    activeRules,
    inactiveRules,
    distinctStores,
  ] = await prisma.$transaction([
    prisma.reorder_rules.findMany({
      where,
      include: {
        product_variants: {
          select: {
            id: true,
            sku: true,
            barcode: true,
            products: {
              select: {
                name: true,
              },
            },
          },
        },
        stores: {
          select: {
            store_id: true,
            name: true,
          },
        },
        suppliers: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy,
      skip,
      take: pageSize,
    }),
    prisma.reorder_rules.count({ where }),
    prisma.reorder_rules.count({ where: { tenant_id: tenantId } }),
    prisma.reorder_rules.count({
      where: { tenant_id: tenantId, is_active: true },
    }),
    prisma.reorder_rules.count({
      where: { tenant_id: tenantId, is_active: false },
    }),
    prisma.reorder_rules.findMany({
      where: { tenant_id: tenantId },
      select: { store_id: true },
      distinct: ['store_id'],
    }),
  ])

  const mappedItems = items.map((rule) => ({
    ...rule,
    reorder_point: Number(rule.reorder_point),
    min_qty: rule.min_qty !== null ? Number(rule.min_qty) : null,
    max_qty: rule.max_qty !== null ? Number(rule.max_qty) : null,
    safety_stock: Number(rule.safety_stock),
    reorder_qty: rule.reorder_qty !== null ? Number(rule.reorder_qty) : null,
    eoq: rule.eoq !== null ? Number(rule.eoq) : null,
    created_at: rule.created_at?.toISOString() ?? new Date().toISOString(),
  }))

  const totalPages = Math.ceil(totalFiltered / pageSize) || 1

  return {
    items: mappedItems,
    total: totalFiltered,
    page,
    pageSize,
    totalPages,
    metrics: {
      totalRules,
      activeRules,
      inactiveRules,
      totalStores: distinctStores.length,
    },
  }
}

export async function createRule(authUserId: string, input: CreateRuleInput) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

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
        created_by_user_id: tenantUserId,
        updated_by_user_id: tenantUserId,
      },
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
  const tenantUserId = await resolveTenantUserId(authUserId)

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
        updated_by_user_id: tenantUserId,
      },
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
