import prisma from '@/lib/prisma'
import { requireTenantId } from '@/server/utils/tenant'

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
 * Scoped by `auth_user_id` (the tenant anchor stamped on every movement).
 */
export async function listMovements(
  authUserId: string,
  filters: MovementFilters = {}
) {
  const limit = Math.min(Math.max(filters.limit ?? 200, 1), 1000)
  const tenantId = await requireTenantId(authUserId)

  const where: Record<string, unknown> = { auth_user_id: tenantId }

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

  return prisma.inventory_movements.findMany({
    where,
    orderBy: { movement_date: 'desc' },
    take: limit,
    include: {
      product_variants: { select: { id: true, sku: true } },
      stores: { select: { store_id: true, name: true } },
      branches: { select: { id: true, name: true } },
    },
  })
}
