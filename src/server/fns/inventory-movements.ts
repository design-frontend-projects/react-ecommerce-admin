'use server'

import { requireTenantId } from '@/server/utils/tenant'
import { runWithTenantContext } from '@/server/context/tenant-context'
import prisma from '@/lib/prisma'

export interface MovementFilters {
  movementType?: string
  storeId?: string
  productVariantId?: string
  referenceType?: string
  dateFrom?: string
  dateTo?: string
  limit?: number
}

const MOVEMENT_TYPES = new Set([
  'opening_stock',
  'sale',
  'sale_return',
  'purchase',
  'purchase_return',
  'transfer_in',
  'transfer_out',
  'adjustment_in',
  'adjustment_out',
  'damage',
  'expired',
  'reserved',
  'released',
])

/**
 * Read the inventory movement ledger for the authenticated user's branches.
 * Strictly scoped by `tenant_id`.
 */
export async function listMovements(
  authUserId: string,
  filters: MovementFilters = {}
) {
  const limit = Math.min(Math.max(filters.limit ?? 200, 1), 1000)
  const tenantId = await requireTenantId(authUserId)

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    const where: Record<string, unknown> = {
      OR: [{ tenant_id: tenantId }, { auth_user_id: tenantId }],
    }

  if (filters.movementType && MOVEMENT_TYPES.has(filters.movementType)) {
    where.movement_type = filters.movementType
  }
  if (filters.storeId) {
    where.store_id = filters.storeId
  }
  if (filters.productVariantId) {
    where.product_variant_id = filters.productVariantId
  }
  if (filters.referenceType) {
    where.reference_type = filters.referenceType
  }
  if (filters.dateFrom || filters.dateTo) {
    where.movement_date = {
      ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
      ...(filters.dateTo ? { lte: new Date(filters.dateTo) } : {}),
    }
  }

    const movements = await prisma.inventory_movements.findMany({
      where,
      orderBy: { movement_date: 'desc' },
      take: limit,
    })

    if (!movements.length) {
      return []
    }

    const variantIds = Array.from(
      new Set(movements.map((m) => m.product_variant_id).filter(Boolean))
    )
    const storeIds = Array.from(
      new Set(movements.map((m) => m.store_id).filter(Boolean))
    ) as string[]
    const branchIds = Array.from(
      new Set(movements.map((m) => m.branch_id).filter(Boolean))
    )

    const [variants, stores, branches] = await Promise.all([
      variantIds.length
        ? prisma.product_variants.findMany({
            where: { id: { in: variantIds } },
            select: { id: true, sku: true },
          })
        : [],
      storeIds.length
        ? prisma.stores.findMany({
            where: { store_id: { in: storeIds } },
            select: { store_id: true, name: true },
          })
        : [],
      branchIds.length
        ? prisma.branches.findMany({
            where: { id: { in: branchIds } },
            select: { id: true, name: true },
          })
        : [],
    ])

    const variantMap = new Map(variants.map((v) => [v.id, v]))
    const storeMap = new Map(stores.map((s) => [s.store_id, s]))
    const branchMap = new Map(branches.map((b) => [b.id, b]))

    return movements.map((m) => ({
      ...m,
      product_variants: variantMap.get(m.product_variant_id) ?? null,
      stores: m.store_id ? (storeMap.get(m.store_id) ?? null) : null,
      branches: branchMap.get(m.branch_id) ?? null,
    }))
  })
}

