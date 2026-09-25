'use server'

import { Prisma, type stock_condition_enum, type movement_type_enum } from '@/generated/prisma/client'
import { ApiError } from '@/server/utils/api-error'
import { requireTenantId, resolveTenantUserId } from '@/server/utils/tenant'
import { runWithTenantContext } from '@/server/context/tenant-context'
import prisma from '@/lib/prisma'

const Decimal = Prisma.Decimal

export interface StockBalanceFilters {
  warehouseId?: string
  warehouseIds?: string[]
  storeId?: string
  locationId?: string
  productVariantId?: string
  condition?: string
  search?: string
  stockStatus?: 'in_stock' | 'low_stock' | 'out_of_stock' | 'all'
  facilityType?: 'all' | 'warehouses' | 'stores'
  page?: number
  pageSize?: number
  limit?: number
  offset?: number
  sortBy?: 'updated_at' | 'qty_on_hand' | 'valuation' | 'product_name' | 'sku'
  sortOrder?: 'asc' | 'desc'
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
 * List stock balances for the authenticated user's tenant with server-side pagination.
 * Uses Prisma 7 with tenant context and joins products, variants, warehouses, and stores.
 */
export async function listStockBalances(
  authUserId: string,
  filters: StockBalanceFilters = {}
) {
  const tenantId = await requireTenantId(authUserId)

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    const pageSize = Math.min(Math.max(1, filters.pageSize ?? filters.limit ?? 20), 100)
    const page = Math.max(
      1,
      filters.page ?? (filters.offset !== undefined ? Math.floor(filters.offset / pageSize) + 1 : 1)
    )
    const skip = filters.offset !== undefined ? filters.offset : (page - 1) * pageSize

    const where: Prisma.stock_balancesWhereInput = {
      tenant_id: tenantId,
    }

    if (filters.facilityType === 'warehouses') {
      where.warehouse_id = { not: null }
    } else if (filters.facilityType === 'stores') {
      where.store_id = { not: null }
    }

    const orConditions: Array<Prisma.stock_balancesWhereInput> = []

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

    // Free text search in product name, variant name, sku, or barcode
    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim()
      where.product_variants = {
        OR: [
          { sku: { contains: q, mode: 'insensitive' } },
          { barcode: { contains: q, mode: 'insensitive' } },
          { name: { contains: q, mode: 'insensitive' } },
          { products: { name: { contains: q, mode: 'insensitive' } } },
        ],
      }
    }

    // Stock status pushdown
    if (filters.stockStatus === 'out_of_stock') {
      where.qty_on_hand = { lte: 0 }
    } else if (filters.stockStatus === 'low_stock') {
      where.qty_on_hand = { gt: 0, lte: 10 }
    } else if (filters.stockStatus === 'in_stock') {
      where.qty_on_hand = { gt: 10 }
    }

    // Sort order pushdown with deterministic tie-breaker
    const sortOrder = filters.sortOrder === 'asc' ? 'asc' : 'desc'
    let orderBy: Prisma.stock_balancesOrderByWithRelationInput[] = [
      { updated_at: sortOrder },
      { id: 'asc' },
    ]

    if (filters.sortBy === 'qty_on_hand') {
      orderBy = [{ qty_on_hand: sortOrder }, { id: 'asc' }]
    } else if (filters.sortBy === 'product_name') {
      orderBy = [{ product_variants: { products: { name: sortOrder } } }, { id: 'asc' }]
    } else if (filters.sortBy === 'sku') {
      orderBy = [{ product_variants: { sku: sortOrder } }, { id: 'asc' }]
    } else if (filters.sortBy === 'updated_at') {
      orderBy = [{ updated_at: sortOrder }, { id: 'asc' }]
    }

    // Execute queries in parallel
    const [rows, totalCount, tenantAggregates, lowStockCount, outOfStockCount, distinctVariants, valuationRows] =
      await Promise.all([
        prisma.stock_balances.findMany({
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
          orderBy,
          take: pageSize,
          skip,
        }),
        prisma.stock_balances.count({ where }),
        prisma.stock_balances.aggregate({
          where: { tenant_id: tenantId },
          _sum: {
            qty_on_hand: true,
            qty_reserved: true,
            qty_available: true,
          },
        }),
        prisma.stock_balances.count({
          where: {
            tenant_id: tenantId,
            qty_on_hand: { gt: 0, lte: 10 },
          },
        }),
        prisma.stock_balances.count({
          where: {
            tenant_id: tenantId,
            qty_on_hand: { lte: 0 },
          },
        }),
        prisma.stock_balances.groupBy({
          by: ['product_variant_id'],
          where: { tenant_id: tenantId },
        }),
        prisma
          .$queryRaw<Array<{ total_valuation: string | number | null }>>(
            Prisma.sql`SELECT COALESCE(SUM(qty_on_hand * avg_cost), 0) as total_valuation FROM stock_balances WHERE tenant_id = ${tenantId}::uuid`
          )
          .catch(() => [{ total_valuation: 0 }]),
      ])

    const mappedRows = rows.map((r) => {
      const onHand = Number(r.qty_on_hand ?? 0)
      const reserved = Number(r.qty_reserved ?? 0)
      const computedAvailable =
        r.qty_available !== null && r.qty_available !== undefined
          ? Number(r.qty_available)
          : Math.max(0, onHand - reserved)
      const avgCost = Number(r.avg_cost ?? 0)
      const valuation = onHand * avgCost

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
        created_at: r.created_at ? r.created_at.toISOString() : new Date().toISOString(),
        updated_at: r.updated_at ? r.updated_at.toISOString() : new Date().toISOString(),
        product_variants: r.product_variants
          ? {
              ...r.product_variants,
              products: r.product_variants.products
                ? {
                    ...r.product_variants.products,
                    reorder_level: null,
                  }
                : null,
            }
          : null,
        warehouses: r.warehouses,
        warehouse_locations: r.warehouse_locations,
        stores: r.stores,
      }
    })

    const totalValuation = Number(valuationRows[0]?.total_valuation ?? 0)
    const totalOnHand = Number(tenantAggregates._sum.qty_on_hand ?? 0)
    const totalReserved = Number(tenantAggregates._sum.qty_reserved ?? 0)
    const totalAvailable = Number(
      tenantAggregates._sum.qty_available ?? Math.max(0, totalOnHand - totalReserved)
    )

    const metrics: StockMetrics = {
      totalVariants: distinctVariants.length,
      totalOnHand,
      totalReserved,
      totalAvailable,
      totalValuation,
      lowStockCount,
      outOfStockCount,
    }

    const totalPages = Math.ceil(totalCount / pageSize)

    return {
      items: mappedRows,
      total: totalCount,
      page,
      pageSize,
      totalPages,
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

    const onHand = Number(balance.qty_on_hand ?? 0)
    const reserved = Number(balance.qty_reserved ?? 0)
    const computedAvailable =
      balance.qty_available !== null && balance.qty_available !== undefined
        ? Number(balance.qty_available)
        : Math.max(0, onHand - reserved)
    const avgCost = Number(balance.avg_cost ?? 0)
    const valuation = onHand * avgCost

    return {
      ...balance,
      qty_on_hand: onHand,
      qty_reserved: reserved,
      qty_available: computedAvailable,
      avg_cost: avgCost,
      valuation,
      last_movement_at: balance.last_movement_at ? balance.last_movement_at.toISOString() : null,
      created_at: balance.created_at ? balance.created_at.toISOString() : new Date().toISOString(),
      updated_at: balance.updated_at ? balance.updated_at.toISOString() : new Date().toISOString(),
      product_variants: balance.product_variants
        ? {
            ...balance.product_variants,
            products: balance.product_variants.products
              ? {
                  ...balance.product_variants.products,
                  reorder_level: null,
                }
              : null,
          }
        : null,
    }
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
        ...(input.locationId ? { location_id: input.locationId } : {}),
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

    return prisma.$transaction(
      async (tx) => {
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
              ...(input.locationId ? { location_id: input.locationId } : {}),
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
      },
      { maxWait: 10000, timeout: 30000 }
    )
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
    const where: Prisma.inventory_movementsWhereInput = {
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
      orderBy: [{ movement_date: 'desc' }, { created_at: 'desc' }],
      take: options.limit ?? 50,
    })
  })
}
