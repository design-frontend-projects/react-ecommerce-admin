'use server'

import type { Prisma } from '@/generated/prisma/client'
import { requireTenantId } from '@/server/utils/tenant'
import { runWithTenantContext } from '@/server/context/tenant-context'
import prisma from '@/lib/prisma'
import type { Inventory } from '@/features/inventory/data/schema'

export interface InventoryItemsQueryOptions {
  search?: string
  page?: number
  pageSize?: number
  limit?: number
  sortBy?: 'product_name' | 'sku' | 'created_at' | 'tracking_type' | 'qty_on_hand' | string
  sortOrder?: 'asc' | 'desc'
  status?: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock' | 'overstocked' | string
  trackingType?: string
  warehouseId?: string
  warehouseName?: string
  storeId?: string
}

export interface InventoryMetrics {
  totalItems: number
  inStockCount: number
  lowStockCount: number
  outOfStockCount: number
  totalValuation: number
  withVariantsCount: number
}

export interface InventoryItemsPaginatedResponse {
  items: Inventory[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
  metrics: InventoryMetrics
}

/**
 * Helper to safely convert Prisma Decimal, Number, or string to standard JS number
 */
function toNum(val: unknown, fallback = 0): number {
  if (val === null || val === undefined) return fallback
  if (typeof val === 'number') return Number.isNaN(val) ? fallback : val
  if (typeof val === 'string') {
    const parsed = Number(val)
    return Number.isNaN(parsed) ? fallback : parsed
  }
  if (typeof val === 'object' && val !== null && 'toString' in val) {
    const parsed = Number((val as { toString: () => string }).toString())
    return Number.isNaN(parsed) ? fallback : parsed
  }
  return fallback
}

/**
 * Server-authoritative paginated listing of inventory_items with Prisma 7,
 * tenant isolation, search, filters, and global KPI metrics computation.
 */
export async function listInventoryItemsPaginated(
  authUserId: string,
  options: InventoryItemsQueryOptions = {}
): Promise<InventoryItemsPaginatedResponse> {
  const tenantId = await requireTenantId(authUserId)

  const page = Math.max(1, Number(options.page || 1))
  const rawPageSize = Number(options.pageSize || options.limit || 20)
  const pageSize = Math.min(Math.max(1, rawPageSize), 100)
  const search = options.search?.trim() || ''
  const sortBy = options.sortBy || 'created_at'
  const sortOrder = options.sortOrder === 'asc' ? 'asc' : 'desc'
  const statusFilter = options.status && options.status !== 'all' ? options.status : undefined
  const trackingType = options.trackingType && options.trackingType !== 'all' ? options.trackingType : undefined
  const warehouseId = options.warehouseId?.trim()
  const warehouseName = options.warehouseName?.trim()
  const storeId = options.storeId?.trim()

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    const where: Prisma.inventory_itemsWhereInput = {
      tenant_id: tenantId,
    }

    if (trackingType) {
      where.tracking_type = trackingType
    }

    const andConditions: Prisma.inventory_itemsWhereInput[] = []

    if (search) {
      andConditions.push({
        OR: [
          { sku: { contains: search, mode: 'insensitive' } },
          { barcode: { contains: search, mode: 'insensitive' } },
          {
            product_variants: {
              OR: [
                { sku: { contains: search, mode: 'insensitive' } },
                { barcode: { contains: search, mode: 'insensitive' } },
                { name: { contains: search, mode: 'insensitive' } },
                {
                  products: {
                    OR: [
                      { name: { contains: search, mode: 'insensitive' } },
                      { sku: { contains: search, mode: 'insensitive' } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      })
    }

    if (warehouseId || warehouseName || storeId) {
      const variantFilter: Prisma.product_variantsWhereInput = {
        stock_balances: {
          some: {
            tenant_id: tenantId,
            ...(warehouseId ? { warehouse_id: warehouseId } : {}),
            ...(warehouseName
              ? {
                  warehouses: {
                    name: { contains: warehouseName, mode: 'insensitive' },
                  },
                }
              : {}),
            ...(storeId ? { store_id: storeId } : {}),
          },
        },
      }
      andConditions.push({
        product_variants: variantFilter,
      })
    }

    if (andConditions.length > 0) {
      where.AND = andConditions
    }

    // Determine ordering
    let orderBy: Prisma.inventory_itemsOrderByWithRelationInput[] = [{ created_at: sortOrder }, { id: 'asc' }]
    if (sortBy === 'product_name') {
      orderBy = [
        { product_variants: { products: { name: sortOrder } } },
        { id: 'asc' },
      ]
    } else if (sortBy === 'sku' || sortBy === 'item_sku') {
      orderBy = [{ sku: sortOrder }, { id: 'asc' }]
    } else if (sortBy === 'tracking_type') {
      orderBy = [{ tracking_type: sortOrder }, { id: 'asc' }]
    } else if (sortBy === 'created_at') {
      orderBy = [{ created_at: sortOrder }, { id: 'asc' }]
    }

    // Fetch total count matching search & relational filters
    const totalCountMatching = await prisma.inventory_items.count({ where })

    // If status filter is NOT applied, we can leverage database pagination directly
    const skip = (page - 1) * pageSize

    const queryTake = statusFilter ? 500 : pageSize
    const querySkip = statusFilter ? 0 : skip

    const rawRows = await prisma.inventory_items.findMany({
      where,
      include: {
        product_variants: {
          include: {
            products: {
              include: {
                categories: { select: { name: true } },
                brands: { select: { name: true } },
              },
            },
            stock_balances: {
              where: { tenant_id: tenantId },
              include: {
                warehouses: { select: { id: true, code: true, name: true } },
                warehouse_locations: {
                  select: { id: true, code: true, name: true, path: true },
                },
                stores: { select: { store_id: true, name: true } },
              },
            },
            reorder_rules: {
              where: { tenant_id: tenantId },
              include: {
                warehouses: { select: { id: true, code: true, name: true } },
                stores: { select: { store_id: true, name: true } },
              },
            },
            price_list_items: {
              select: { price: true, cost_price: true },
              take: 1,
            },
          },
        },
        uoms: {
          select: {
            id: true,
            code: true,
            name: true,
            is_base: true,
            uom_category: true,
          },
        },
      },
      orderBy,
      take: queryTake,
      skip: querySkip,
    })

    // Map rows to Inventory domain model with aggregated metrics
    const mappedItems: Inventory[] = rawRows.map((item) => {
      const variant = item.product_variants
      const balances = variant?.stock_balances || []
      const rules = variant?.reorder_rules || []
      const primaryRule = rules[0] || null

      const qty_on_hand = balances.reduce(
        (sum: number, b) => sum + toNum(b.qty_on_hand),
        0
      )
      const qty_reserved = balances.reduce(
        (sum: number, b) => sum + toNum(b.qty_reserved),
        0
      )
      const qty_available = balances.reduce(
        (sum: number, b) => sum + toNum(b.qty_available, toNum(b.qty_on_hand) - toNum(b.qty_reserved)),
        0
      )

      const totalVal = balances.reduce(
        (sum: number, b) => sum + toNum(b.qty_on_hand) * toNum(b.avg_cost),
        0
      )
      const avg_cost =
        qty_on_hand > 0
          ? totalVal / qty_on_hand
          : toNum(balances[0]?.avg_cost, toNum(variant?.price_list_items?.[0]?.cost_price))

      const primaryBalance = balances[0] || null
      const primaryWh = primaryRule?.warehouses || primaryBalance?.warehouses || null
      const primaryLoc = primaryBalance?.warehouse_locations || null
      const primaryStore = primaryRule?.stores || primaryBalance?.stores || null

      const reorder_point = primaryRule ? toNum(primaryRule.reorder_point) : null
      const min_quantity = primaryRule ? toNum(primaryRule.min_qty) : null
      const max_quantity = primaryRule ? toNum(primaryRule.max_qty) : null
      const safety_stock = primaryRule ? toNum(primaryRule.safety_stock) : null
      const reorder_quantity = primaryRule ? toNum(primaryRule.reorder_qty) : null
      const lead_time_days = primaryRule?.lead_time_days ?? null

      return {
        id: item.id,
        inventory_id: item.id,
        tenant_id: item.tenant_id,
        product_variant_id: item.product_variant_id,
        product_id: variant?.product_id,
        sku: item.sku,
        barcode: item.barcode || variant?.barcode || null,
        is_stockable: item.is_stockable,
        is_sellable: item.is_sellable,
        is_purchasable: item.is_purchasable,
        tracking_type: item.tracking_type,
        unit_of_measure_id: item.unit_of_measure_id,
        status: item.status,
        is_active: item.is_active,
        notes: item.notes,
        created_at: item.created_at ? item.created_at.toISOString() : new Date().toISOString(),
        updated_at: item.updated_at ? item.updated_at.toISOString() : new Date().toISOString(),
        created_by_user_id: item.created_by_user_id,
        updated_by_user_id: item.updated_by_user_id,

        products: variant?.products
          ? {
              id: variant.products.id,
              name: variant.products.name,
              sku: variant.products.sku,
              has_variants: variant.products.has_variants,
              barcode: variant.products.barcode,
              brand: variant.products.brands?.name || null,
              category: variant.products.categories?.name || null,
            }
          : null,

        product_variants: variant
          ? {
              id: variant.id,
              product_id: variant.product_id,
              name: variant.name,
              sku: variant.sku,
              barcode: variant.barcode,
              weight: toNum(variant.weight),
              dimensions: variant.dimensions,
              is_active: variant.is_active ?? true,
              price: toNum(variant.price_list_items?.[0]?.price),
              cost_price: toNum(variant.price_list_items?.[0]?.cost_price),
              qty_on_hand,
              qty_available,
              qty_reserved,
            }
          : null,

        uoms: item.uoms
          ? {
              id: item.uoms.id,
              code: item.uoms.code,
              name: item.uoms.name,
              is_base: item.uoms.is_base ?? undefined,
              uom_category: item.uoms.uom_category ?? null,
            }
          : null,

        warehouses: primaryWh
          ? {
              id: primaryWh.id,
              code: primaryWh.code,
              name: primaryWh.name,
            }
          : null,

        warehouse_locations: primaryLoc
          ? {
              id: primaryLoc.id,
              code: primaryLoc.code,
              name: primaryLoc.name,
              path: primaryLoc.path,
            }
          : null,

        stores: primaryStore
          ? {
              store_id: primaryStore.store_id,
              name: primaryStore.name,
            }
          : null,

        reorder_point,
        min_quantity,
        max_quantity,
        safety_stock,
        reorder_quantity,
        lead_time_days,

        qty_on_hand,
        qty_reserved,
        qty_available,
        avg_cost,
        unit_cost: avg_cost,
        condition: primaryBalance?.condition || 'good',
        last_movement_at: primaryBalance?.last_movement_at
          ? primaryBalance.last_movement_at.toISOString()
          : null,

        quantity: qty_on_hand,
        reorder_level: reorder_point,
        max_stock_level: max_quantity,
      }
    })

    // Compute status helper
    const computeStatus = (item: Inventory): 'in_stock' | 'low_stock' | 'out_of_stock' | 'overstocked' => {
      const qty = Number(item.qty_on_hand ?? 0)
      const min = item.reorder_point ?? item.min_quantity ?? item.reorder_level ?? 0
      const max = item.max_quantity ?? item.max_stock_level
      if (qty === 0) return 'out_of_stock'
      if (qty <= min) return 'low_stock'
      if (max != null && qty > max) return 'overstocked'
      return 'in_stock'
    }

    let finalItems = mappedItems
    let totalCount = totalCountMatching

    if (statusFilter) {
      finalItems = mappedItems.filter((i) => computeStatus(i) === statusFilter)
      totalCount = finalItems.length
      // Apply pagination slicing to filtered subset
      finalItems = finalItems.slice(skip, skip + pageSize)
    }

    // Parallel fetch for tenant-wide global KPI metrics
    const [allTenantItems, tenantBalances] = await Promise.all([
      prisma.inventory_items.findMany({
        where: { tenant_id: tenantId },
        select: {
          id: true,
          product_variant_id: true,
          product_variants: {
            select: {
              reorder_rules: {
                where: { tenant_id: tenantId },
                select: { reorder_point: true, min_qty: true },
                take: 1,
              },
            },
          },
        },
      }),
      prisma.stock_balances.findMany({
        where: { tenant_id: tenantId },
        select: {
          product_variant_id: true,
          qty_on_hand: true,
          avg_cost: true,
        },
      }),
    ])

    // Build variant to balance map for fast metric aggregation
    const balanceAggMap = new Map<string, { qty: number; valuation: number }>()
    for (const sb of tenantBalances) {
      const cur = balanceAggMap.get(sb.product_variant_id) || { qty: 0, valuation: 0 }
      const qty = toNum(sb.qty_on_hand)
      const cost = toNum(sb.avg_cost)
      cur.qty += qty
      cur.valuation += qty * cost
      balanceAggMap.set(sb.product_variant_id, cur)
    }

    let inStockCount = 0
    let lowStockCount = 0
    let outOfStockCount = 0
    let totalValuation = 0
    let withVariantsCount = 0

    for (const inv of allTenantItems) {
      if (inv.product_variant_id) withVariantsCount++
      const agg = balanceAggMap.get(inv.product_variant_id)
      const qty = agg?.qty ?? 0
      totalValuation += agg?.valuation ?? 0

      const rule = inv.product_variants?.reorder_rules?.[0]
      const min = toNum(rule?.reorder_point ?? rule?.min_qty, 0)

      if (qty === 0) {
        outOfStockCount++
      } else if (qty <= min) {
        lowStockCount++
      } else {
        inStockCount++
      }
    }

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

    return {
      items: finalItems,
      totalCount,
      page,
      pageSize,
      totalPages,
      metrics: {
        totalItems: allTenantItems.length,
        inStockCount,
        lowStockCount,
        outOfStockCount,
        totalValuation,
        withVariantsCount,
      },
    }
  })
}
