'use server'

import type { Prisma } from '@/generated/prisma/client'
import { requireTenantId } from '@/server/utils/tenant'
import { runWithTenantContext } from '@/server/context/tenant-context'
import prisma from '@/lib/prisma'
import type { VariantSearchResult, VariantSearchResponse } from '@/features/stock-balances/data/schema'

export interface AlternativeWarehouseStock {
  warehouse_id: string
  warehouse_name: string
  warehouse_code: string
  qty_on_hand: number
  qty_reserved: number
  qty_available: number
}

export interface SourceWarehouseStock {
  warehouse_id: string
  warehouse_name?: string | null
  warehouse_code?: string | null
  qty_on_hand: number
  qty_reserved: number
  qty_available: number
}

export interface ProductVariantQueryOptions {
  search?: string
  page?: number
  pageSize?: number
  limit?: number
  sortBy?: 'sku' | 'name' | 'product_name' | 'created_at' | string
  sortOrder?: 'asc' | 'desc'
  productId?: string
  isAssigned?: 'all' | 'assigned' | 'unassigned' | string
  warehouseId?: string
  includeAlternatives?: boolean
}

export interface PaginatedVariantItem extends VariantSearchResult {
  product_id?: string
  brand_name?: string | null
  category_name?: string | null
  uom_id?: string | null
  dimensions?: unknown
  weight?: number | null
  is_active?: boolean
  is_assigned_to_inventory?: boolean
  inventory_item_id?: string | null
  inventory_item_sku?: string | null
  inventory_item_status?: string | null
  qty_on_hand?: number
  qty_available?: number
  qty_reserved?: number
  source_stock?: SourceWarehouseStock | null
  alternative_warehouses?: AlternativeWarehouseStock[]
}

export interface PaginatedVariantsResponse {
  success: boolean
  items: PaginatedVariantItem[]
  pagination: {
    page: number
    pageSize: number
    totalCount: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

/**
 * Paginated product variants lookup with server-side search, sorting, and inventory item assignment status.
 */
export async function searchProductVariantsPaginated(
  authUserId: string,
  options: ProductVariantQueryOptions = {}
): Promise<PaginatedVariantsResponse> {
  const tenantId = await requireTenantId(authUserId)

  const page = Math.max(1, Number(options.page || 1))
  const rawPageSize = Number(options.pageSize || options.limit || 10)
  const pageSize = Math.min(Math.max(1, rawPageSize), 100)
  const search = options.search?.trim() || ''
  const sortBy = options.sortBy || 'sku'
  const sortOrder = options.sortOrder === 'desc' ? 'desc' : 'asc'
  const productId = options.productId?.trim()
  const isAssigned = options.isAssigned || 'all'

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    const where: Prisma.product_variantsWhereInput = {
      tenant_id: tenantId,
      is_active: { not: false },
    }

    if (productId && productId !== 'all' && productId !== 'none') {
      where.product_id = productId
    }

    if (isAssigned === 'unassigned') {
      where.inventory_items = { is: null }
    } else if (isAssigned === 'assigned') {
      where.inventory_items = { isNot: null }
    }

    if (search) {
      where.OR = [
        { sku: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { products: { name: { contains: search, mode: 'insensitive' } } },
        { products: { sku: { contains: search, mode: 'insensitive' } } },
        { products: { barcode: { contains: search, mode: 'insensitive' } } },
        { products: { brands: { name: { contains: search, mode: 'insensitive' } } } },
        { products: { categories: { name: { contains: search, mode: 'insensitive' } } } },
      ]
    }

    let orderBy: Prisma.product_variantsOrderByWithRelationInput = { sku: sortOrder }
    if (sortBy === 'product_name') {
      orderBy = { products: { name: sortOrder } }
    } else if (sortBy === 'name') {
      orderBy = { name: sortOrder }
    } else if (sortBy === 'created_at') {
      orderBy = { created_at: sortOrder }
    }

    const [totalCount, variants] = await Promise.all([
      prisma.product_variants.count({ where }),
      prisma.product_variants.findMany({
        where,
        select: {
          id: true,
          sku: true,
          barcode: true,
          name: true,
          weight: true,
          dimensions: true,
          is_active: true,
          uom_id: true,
          product_id: true,
          products: {
            select: {
              id: true,
              name: true,
              sku: true,
              barcode: true,
              base_uom_id: true,
              categories: { select: { name: true } },
              brands: { select: { name: true } },
            },
          },
          price_list_items: {
            select: {
              price: true,
              cost_price: true,
            },
            take: 1,
          },
          inventory_items: {
            select: {
              id: true,
              sku: true,
              status: true,
              is_active: true,
              stock_balances: {
                select: {
                  warehouse_id: true,
                  qty_on_hand: true,
                  qty_reserved: true,
                  qty_available: true,
                  warehouses: {
                    select: {
                      id: true,
                      code: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    const totalPages = Math.ceil(totalCount / pageSize) || 1
    const targetWarehouseId = options.warehouseId?.trim() || null

    const items: PaginatedVariantItem[] = variants.map((v) => {
      const pli = v.price_list_items?.[0]
      const balances = (v.inventory_items?.stock_balances || []) as Array<{
        warehouse_id: string | null
        qty_on_hand: unknown
        qty_reserved: unknown
        qty_available: unknown
        warehouses: { id: string; code: string; name: string } | null
      }>

      // Global totals
      const totalOnHand = balances.reduce(
        (sum, s) => sum + Number(s.qty_on_hand || 0),
        0
      )
      const totalReserved = balances.reduce(
        (sum, s) => sum + Number(s.qty_reserved || 0),
        0
      )
      const totalAvailable = Math.max(0, totalOnHand - totalReserved)

      // Warehouse specific & alternative resolution
      let sourceStock: SourceWarehouseStock | null = null
      const altWarehouseMap = new Map<string, AlternativeWarehouseStock>()

      for (const b of balances) {
        if (!b.warehouse_id) continue
        const onHand = Number(b.qty_on_hand || 0)
        const reserved = Number(b.qty_reserved || 0)
        const avail =
          b.qty_available != null
            ? Number(b.qty_available)
            : Math.max(0, onHand - reserved)

        if (targetWarehouseId && b.warehouse_id === targetWarehouseId) {
          if (!sourceStock) {
            sourceStock = {
              warehouse_id: b.warehouse_id,
              warehouse_name: b.warehouses?.name ?? null,
              warehouse_code: b.warehouses?.code ?? null,
              qty_on_hand: onHand,
              qty_reserved: reserved,
              qty_available: avail,
            }
          } else {
            sourceStock.qty_on_hand += onHand
            sourceStock.qty_reserved += reserved
            sourceStock.qty_available += avail
          }
        } else {
          const existing = altWarehouseMap.get(b.warehouse_id)
          if (existing) {
            existing.qty_on_hand += onHand
            existing.qty_reserved += reserved
            existing.qty_available += avail
          } else {
            altWarehouseMap.set(b.warehouse_id, {
              warehouse_id: b.warehouse_id,
              warehouse_name: b.warehouses?.name || 'Warehouse',
              warehouse_code: b.warehouses?.code || 'WH',
              qty_on_hand: onHand,
              qty_reserved: reserved,
              qty_available: avail,
            })
          }
        }
      }

      // If target warehouse was requested but had no balance row, create a 0-stock record
      if (targetWarehouseId && !sourceStock) {
        sourceStock = {
          warehouse_id: targetWarehouseId,
          warehouse_name: null,
          warehouse_code: null,
          qty_on_hand: 0,
          qty_reserved: 0,
          qty_available: 0,
        }
      }

      // Alternative warehouses with positive stock, sorted by highest available stock first
      const alternativeWarehouses = Array.from(altWarehouseMap.values())
        .filter((w) => w.qty_available > 0 || w.qty_on_hand > 0)
        .sort((a, b) => b.qty_available - a.qty_available)

      // When warehouseId is passed, default onHand & available to the requested warehouse's stock
      const effectiveOnHand = targetWarehouseId ? (sourceStock?.qty_on_hand ?? 0) : totalOnHand
      const effectiveReserved = targetWarehouseId ? (sourceStock?.qty_reserved ?? 0) : totalReserved
      const effectiveAvailable = targetWarehouseId ? (sourceStock?.qty_available ?? 0) : totalAvailable

      const inv = v.inventory_items

      return {
        id: v.id,
        product_id: v.product_id,
        sku: v.sku,
        barcode: v.barcode ?? null,
        name: v.name ?? null,
        product_name: v.products?.name ?? '',
        brand_name: v.products?.brands?.name ?? null,
        category_name: v.products?.categories?.name ?? null,
        uom_id: v.uom_id || v.products?.base_uom_id || null,
        dimensions: v.dimensions,
        weight: v.weight ? Number(v.weight) : null,
        is_active: v.is_active !== false,
        price: pli?.price ? Number(pli.price) : 0,
        cost_price: pli?.cost_price != null ? Number(pli.cost_price) : null,
        is_assigned_to_inventory: !!inv,
        inventory_item_id: inv?.id ?? null,
        inventory_item_sku: inv?.sku ?? null,
        inventory_item_status: inv?.status ?? null,
        qty_on_hand: effectiveOnHand,
        qty_available: effectiveAvailable,
        qty_reserved: effectiveReserved,
        source_stock: sourceStock,
        alternative_warehouses: alternativeWarehouses,
      }
    })

    return {
      success: true,
      items,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    }
  })
}

/**
 * Search product variants with tenant isolation, debounced lookup, and price/cost resolution.
 * Preserves backwards compatibility for existing callers.
 */
export async function searchProductVariants(
  authUserId: string,
  searchOrOptions: string | ProductVariantQueryOptions = '',
  limit = 25
): Promise<VariantSearchResponse & { pagination?: PaginatedVariantsResponse['pagination'] }> {
  if (typeof searchOrOptions === 'object') {
    return searchProductVariantsPaginated(authUserId, searchOrOptions)
  }

  const res = await searchProductVariantsPaginated(authUserId, {
    search: searchOrOptions,
    limit,
    pageSize: limit,
    page: 1,
  })

  return {
    success: true,
    items: res.items,
    pagination: res.pagination,
  }
}
