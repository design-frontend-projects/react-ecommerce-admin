'use server'

import { Prisma, type stock_condition_enum, type movement_type_enum } from '@/generated/prisma/client'

const Decimal = Prisma.Decimal
import { ApiError } from '@/server/utils/api-error'
import { requireTenantId, resolveTenantUserId } from '@/server/utils/tenant'
import { runWithTenantContext } from '@/server/context/tenant-context'
import prisma from '@/lib/prisma'

export interface StockBalanceFilters {
  warehouseId?: string
  warehouseIds?: string[]
  storeId?: string
  locationId?: string
  productVariantId?: string
  condition?: string
  search?: string
  stockStatus?: 'in_stock' | 'low_stock' | 'out_of_stock' | 'all'
  limit?: number
  offset?: number
}

export interface StockAdjustmentInput {
  warehouseId?: string | null
  locationId?: string | null
  storeId?: string | null
  productVariantId: string
  condition?: 'good' | 'damaged' | 'refurbished' | 'returned'
  batchId?: string | null
  serialId?: string | null
  adjustmentType: 'set' | 'offset'
  quantity: number
  unitCost?: number
  reasonCode: string
  reason: string
}

export interface StockMetrics {
  totalVariants: number
  totalOnHand: number
  totalReserved: number
  totalAvailable: number
  totalValuation: number
  lowStockCount: number
  outOfStockCount: number
}

/**
 * List stock balances for the authenticated user's tenant.
 * Uses Prisma 7 with tenant context and joins products, variants, warehouses, and stores.
 */
export async function listStockBalances(
  authUserId: string,
  filters: StockBalanceFilters = {}
) {
  const tenantId = await requireTenantId(authUserId)

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    const where: Record<string, unknown> = {
      tenant_id: tenantId,
    }

    const orConditions: Array<Record<string, unknown>> = []

    if (filters.warehouseIds && filters.warehouseIds.length > 0) {
      orConditions.push({ warehouse_id: { in: filters.warehouseIds } })
    } else if (filters.warehouseId) {
      orConditions.push({ warehouse_id: filters.warehouseId })
    }

    if (filters.storeId) {
      orConditions.push({ store_id: filters.storeId })
    }

    if (orConditions.length > 1) {
      where.OR = orConditions
    } else if (orConditions.length === 1) {
      Object.assign(where, orConditions[0])
    }
    if (filters.locationId) {
      where.location_id = filters.locationId
    }
    if (filters.productVariantId) {
      where.product_variant_id = filters.productVariantId
    }
    if (filters.condition) {
      where.condition = filters.condition as stock_condition_enum
    }

    // Free text search in product name or sku
    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim()
      where.product_variants = {
        OR: [
          { sku: { contains: q, mode: 'insensitive' } },
          { barcode: { contains: q, mode: 'insensitive' } },
          { products: { name: { contains: q, mode: 'insensitive' } } },
        ],
      }
    }

    const rows = await prisma.stock_balances.findMany({
      where,
      include: {
        product_variants: {
          select: {
            id: true,
            sku: true,
            barcode: true,
            name: true,
            products: {
              select: {
                id: true,
                name: true,
                sku: true,
                is_batch_tracked: true,
                is_serial_tracked: true,
                reorder_level: true,
              },
            },
          },
        },
        warehouses: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        warehouse_locations: {
          select: {
            id: true,
            code: true,
            name: true,
            location_type: true,
          },
        },
        stores: {
          select: {
            store_id: true,
            name: true,
          },
        },
      },
      orderBy: [{ updated_at: 'desc' }],
      take: filters.limit ? Math.min(filters.limit, 1000) : 1000,
      skip: filters.offset ?? 0,
    })

    // Compute metrics across tenant's balances
    let totalOnHand = 0
    let totalReserved = 0
    let totalAvailable = 0
    let totalValuation = 0
    let lowStockCount = 0
    let outOfStockCount = 0
    const uniqueVariants = new Set<string>()

    const mappedRows = rows.map((r) => {
      uniqueVariants.add(r.product_variant_id)
      const onHand = Number(r.qty_on_hand ?? 0)
      const reserved = Number(r.qty_reserved ?? 0)
      const computedAvailable =
        r.qty_available !== null && r.qty_available !== undefined
          ? Number(r.qty_available)
          : Math.max(0, onHand - reserved)
      const avgCost = Number(r.avg_cost ?? 0)
      const valuation = onHand * avgCost
      const reorderLevel = Number(r.product_variants?.products?.reorder_level ?? 10)

      totalOnHand += onHand
      totalReserved += reserved
      totalAvailable += computedAvailable
      totalValuation += valuation

      if (onHand <= 0) {
        outOfStockCount += 1
      } else if (onHand <= reorderLevel) {
        lowStockCount += 1
      }

      return {
        id: r.id,
        tenant_id: r.tenant_id,
        warehouse_id: r.warehouse_id,
        location_id: r.location_id,
        store_id: r.store_id,
        product_variant_id: r.product_variant_id,
        condition: r.condition,
        batch_id: r.batch_id,
        serial_id: r.serial_id,
        qty_on_hand: onHand,
        qty_reserved: reserved,
        qty_available: computedAvailable,
        avg_cost: avgCost,
        valuation,
        last_movement_at: r.last_movement_at ? r.last_movement_at.toISOString() : null,
        created_at: r.created_at.toISOString(),
        updated_at: r.updated_at.toISOString(),
        product_variants: r.product_variants,
        warehouses: r.warehouses,
        warehouse_locations: r.warehouse_locations,
        stores: r.stores,
      }
    })

    // Filter by stockStatus client-filter if provided
    let finalRows = mappedRows
    if (filters.stockStatus === 'out_of_stock') {
      finalRows = mappedRows.filter((row) => row.qty_on_hand <= 0)
    } else if (filters.stockStatus === 'low_stock') {
      finalRows = mappedRows.filter((row) => {
        const threshold = Number(row.product_variants?.products?.reorder_level ?? 10)
        return row.qty_on_hand > 0 && row.qty_on_hand <= threshold
      })
    } else if (filters.stockStatus === 'in_stock') {
      finalRows = mappedRows.filter((row) => {
        const threshold = Number(row.product_variants?.products?.reorder_level ?? 10)
        return row.qty_on_hand > threshold
      })
    }

    const metrics: StockMetrics = {
      totalVariants: uniqueVariants.size,
      totalOnHand,
      totalReserved,
      totalAvailable,
      totalValuation,
      lowStockCount,
      outOfStockCount,
    }

    return {
      items: finalRows,
      total: finalRows.length,
      metrics,
    }
  })
}

/**
 * Get a single stock balance record by ID.
 */
export async function getStockBalance(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    const balance = await prisma.stock_balances.findFirst({
      where: { id, tenant_id: tenantId },
      include: {
        product_variants: {
          include: {
            products: true,
          },
        },
        warehouses: true,
        warehouse_locations: true,
        stores: true,
      },
    })

    if (!balance) {
      throw new ApiError('Stock balance not found.', 404)
    }

    return balance
  })
}

/**
 * Adjust stock balance (atomic update + append to inventory_movements ledger).
 */
export async function adjustStockBalance(
  authUserId: string,
  input: StockAdjustmentInput
) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  if (!input.productVariantId) {
    throw new ApiError('Product variant is required.', 400)
  }
  if (!input.warehouseId && !input.storeId) {
    throw new ApiError('Either a warehouse or store location is required.', 400)
  }
  if (typeof input.quantity !== 'number' || Number.isNaN(input.quantity)) {
    throw new ApiError('A valid numeric quantity is required.', 400)
  }
  if (!['set', 'offset'].includes(input.adjustmentType)) {
    throw new ApiError('Invalid adjustment type.', 400)
  }

  const condition = (input.condition ?? 'good') as stock_condition_enum

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    // Find matching existing balance record
    const existingBalance = await prisma.stock_balances.findFirst({
      where: {
        tenant_id: tenantId,
        product_variant_id: input.productVariantId,
        warehouse_id: input.warehouseId ?? null,
        store_id: input.storeId ?? null,
        condition,
      },
    })

    const currentOnHand = existingBalance ? Number(existingBalance.qty_on_hand) : 0
    const currentReserved = existingBalance ? Number(existingBalance.qty_reserved) : 0
    const currentAvgCost = existingBalance ? Number(existingBalance.avg_cost) : 0

    let newOnHand: number
    let delta: number

    if (input.adjustmentType === 'set') {
      newOnHand = input.quantity
      delta = newOnHand - currentOnHand
    } else {
      delta = input.quantity
      newOnHand = currentOnHand + delta
    }

    if (newOnHand < 0) {
      throw new ApiError(
        `Negative stock is not permitted. Current: ${currentOnHand}, Requested new: ${newOnHand}`,
        400
      )
    }

    if (delta === 0) {
      return {
        skipped: true,
        message: 'No quantity change required.',
        qty_on_hand: currentOnHand,
      }
    }

    const newAvailable = Math.max(0, newOnHand - currentReserved)

    // Calculate new moving average cost if adjusting in
    const inputUnitCost = input.unitCost ?? currentAvgCost
    let newAvgCost = currentAvgCost
    if (delta > 0 && newOnHand > 0) {
      newAvgCost = (currentOnHand * currentAvgCost + delta * inputUnitCost) / newOnHand
    }

    // Determine movement type
    let movementType: movement_type_enum
    if (input.reasonCode === 'damaged') {
      movementType = 'damage'
    } else if (input.reasonCode === 'expired') {
      movementType = 'expired'
    } else if (delta > 0) {
      movementType = 'adjustment_in'
    } else {
      movementType = 'adjustment_out'
    }

    return prisma.$transaction(async (tx) => {
      // 1. Upsert stock_balances
      let updatedBalance
      if (existingBalance) {
        updatedBalance = await tx.stock_balances.update({
          where: { id: existingBalance.id },
          data: {
            qty_on_hand: new Decimal(newOnHand),
            qty_available: new Decimal(newAvailable),
            avg_cost: new Decimal(newAvgCost),
            last_movement_at: new Date(),
            updated_at: new Date(),
            updated_by_user_id: tenantUserId,
          },
        })
      } else {
        updatedBalance = await tx.stock_balances.create({
          data: {
            tenant_id: tenantId,
            warehouse_id: input.warehouseId ?? null,
            location_id: input.locationId ?? null,
            store_id: input.storeId ?? null,
            product_variant_id: input.productVariantId,
            condition,
            batch_id: input.batchId ?? null,
            serial_id: input.serialId ?? null,
            qty_on_hand: new Decimal(newOnHand),
            qty_reserved: new Decimal(0),
            qty_available: new Decimal(newAvailable),
            avg_cost: new Decimal(newAvgCost),
            last_movement_at: new Date(),
            created_by_user_id: tenantUserId,
            updated_by_user_id: tenantUserId,
          },
        })
      }

      // 2. Append immutable record to inventory_movements ledger
      await tx.inventory_movements.create({
        data: {
          tenant_id: tenantId,
          store_id: input.storeId ?? null,
          warehouse_id: input.warehouseId ?? null,
          warehouse_location_id: input.locationId ?? null,
          product_variant_id: input.productVariantId,
          movement_type: movementType,
          status: 'posted',
          condition,
          quantity_delta: new Decimal(delta),
          unit_cost: new Decimal(inputUnitCost),
          total_cost: new Decimal(Math.abs(delta) * inputUnitCost),
          qty_before: new Decimal(currentOnHand),
          qty_after: new Decimal(newOnHand),
          reference_type: 'manual_adjustment',
          reference_id: updatedBalance.id,
          reason_code: input.reasonCode,
          remarks: input.reason,
          created_by: authUserId,
          created_by_user_id: tenantUserId,
          updated_by_user_id: tenantUserId,
        },
      })

      return updatedBalance
    })
  })
}

/**
 * List recent inventory movements for a specific stock balance / product variant.
 */
export async function getStockBalanceMovements(
  authUserId: string,
  productVariantId: string,
  options: { warehouseId?: string; storeId?: string; limit?: number } = {}
) {
  const tenantId = await requireTenantId(authUserId)

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    const where: Record<string, unknown> = {
      tenant_id: tenantId,
      product_variant_id: productVariantId,
    }

    if (options.warehouseId) {
      where.warehouse_id = options.warehouseId
    }
    if (options.storeId) {
      where.store_id = options.storeId
    }

    return prisma.inventory_movements.findMany({
      where,
      orderBy: { movement_date: 'desc' },
      take: options.limit ?? 50,
    })
  })
}
