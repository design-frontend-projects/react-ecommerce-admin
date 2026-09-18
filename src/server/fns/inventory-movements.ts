'use server'

import { requireTenantId } from '@/server/utils/tenant'
import { runWithTenantContext } from '@/server/context/tenant-context'
import prisma from '@/lib/prisma'

export interface MovementFilters {
  movementType?: string
  warehouseId?: string
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
  'production_output',
  'production_consumption',
  'lost',
  'found',
  'cycle_count_in',
  'cycle_count_out',
  'reservation_conversion',
  'consumption',
])

/**
 * Read the inventory movement ledger for the authenticated user's tenant.
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
      tenant_id: tenantId,
    }

    if (filters.movementType && MOVEMENT_TYPES.has(filters.movementType)) {
      where.movement_type = filters.movementType
    }
    if (filters.warehouseId && filters.storeId && filters.warehouseId === filters.storeId) {
      where.OR = [
        { warehouse_id: filters.warehouseId },
        { store_id: filters.storeId },
      ]
    } else {
      if (filters.warehouseId) {
        where.warehouse_id = filters.warehouseId
      }
      if (filters.storeId) {
        where.store_id = filters.storeId
      }
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
    const warehouseIds = Array.from(
      new Set(movements.map((m) => m.warehouse_id).filter(Boolean))
    ) as string[]
    const storeIds = Array.from(
      new Set(movements.map((m) => m.store_id).filter(Boolean))
    ) as string[]
    const branchIds = Array.from(
      new Set(movements.map((m) => m.branch_id).filter(Boolean))
    ) as string[]
    const locationIds = Array.from(
      new Set(
        movements
          .map((m) => m.warehouse_location_id ?? m.location_id)
          .filter(Boolean)
      )
    ) as string[]

    const [variants, warehouses, stores, branches, locations] = await Promise.all([
      variantIds.length
        ? prisma.product_variants.findMany({
            where: { id: { in: variantIds } },
            select: { id: true, sku: true, barcode: true, name: true },
          })
        : [],
      warehouseIds.length
        ? prisma.warehouses.findMany({
            where: { id: { in: warehouseIds } },
            select: { id: true, name: true, code: true },
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
      locationIds.length
        ? prisma.warehouse_locations.findMany({
            where: { id: { in: locationIds } },
            select: { id: true, name: true, code: true },
          })
        : [],
    ])

    const variantMap = new Map(variants.map((v) => [v.id, v]))
    const warehouseMap = new Map(warehouses.map((w) => [w.id, w]))
    const storeMap = new Map(stores.map((s) => [s.store_id, s]))
    const branchMap = new Map(branches.map((b) => [b.id, b]))
    const locationMap = new Map(locations.map((l) => [l.id, l]))

    return movements.map((m) => {
      const delta = m.quantity_delta != null ? Number(m.quantity_delta) : 0
      const qtyIn = delta > 0 ? delta : 0
      const qtyOut = delta < 0 ? Math.abs(delta) : 0
      const locId = m.warehouse_location_id ?? m.location_id

      return {
        ...m,
        movement_no: m.movement_no != null ? m.movement_no.toString() : null,
        quantity_delta: delta,
        qty: delta,
        qty_in: qtyIn,
        qty_out: qtyOut,
        unit_cost: m.unit_cost != null ? Number(m.unit_cost) : 0,
        total_cost: m.total_cost != null ? Number(m.total_cost) : 0,
        qty_before: m.qty_before != null ? Number(m.qty_before) : null,
        qty_after: m.qty_after != null ? Number(m.qty_after) : null,
        movement_date:
          m.movement_date instanceof Date
            ? m.movement_date.toISOString()
            : String(m.movement_date),
        occurred_at:
          m.occurred_at instanceof Date
            ? m.occurred_at.toISOString()
            : String(m.occurred_at),
        created_at:
          m.created_at instanceof Date
            ? m.created_at.toISOString()
            : String(m.created_at),
        product_variants: variantMap.get(m.product_variant_id) ?? null,
        warehouses: m.warehouse_id ? (warehouseMap.get(m.warehouse_id) ?? null) : null,
        stores: m.store_id ? (storeMap.get(m.store_id) ?? null) : null,
        branches: m.branch_id ? (branchMap.get(m.branch_id) ?? null) : null,
        warehouse_locations: locId ? (locationMap.get(locId) ?? null) : null,
      }
    })
  })
}


