'use server'

import type { Prisma, stock_condition_enum } from '@/generated/prisma/client'
import { runWithTenantContext } from '@/server/context/tenant-context'
import { requireTenantId } from '@/server/utils/tenant'
import prisma from '@/lib/prisma'

export interface ValuationFilters {
  search?: string
  warehouseId?: string
  storeId?: string
  categoryId?: string
  supplierId?: string
  condition?: string
  stockStatus?: 'in_stock' | 'low_stock' | 'out_of_stock' | 'high_value' | 'all'
  valuationMethod?: 'avco' | 'standard' | 'fifo' | 'retail'
  page?: number
  limit?: number
  sortBy?:
    | 'totalValue'
    | 'onHand'
    | 'unitCost'
    | 'productName'
    | 'sku'
    | 'potentialRevenue'
    | 'potentialMargin'
  sortOrder?: 'asc' | 'desc'
}

export interface ValuationItemRow {
  id: string
  balanceId: string
  warehouseId?: string | null
  warehouseName?: string | null
  warehouseCode?: string | null
  storeId?: string | null
  storeName?: string | null
  locationId?: string | null
  locationName?: string | null
  locationCode?: string | null
  variantId: string
  sku: string
  barcode?: string | null
  productName: string
  productId: string
  categoryId?: string | null
  categoryName: string
  supplierId?: string | null
  supplierName?: string | null
  condition: string
  onHand: number
  reserved: number
  available: number
  reorderLevel: number
  avcoUnitCost: number
  standardUnitCost: number
  fifoUnitCost: number
  unitCost: number
  sellingPrice: number
  totalValue: number
  potentialRevenue: number
  potentialMargin: number
  sharePercent: number
  lastMovementAt?: string | null
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock'
  currencySymbol?: string
}

export interface ValuationMetrics {
  totalValuation: number
  totalUnits: number
  totalPotentialRevenue: number
  averageMargin: number
  lowStockCount: number
  outOfStockCount: number
  totalLines: number
  methodTotals: {
    avco: number
    standard: number
    fifo: number
    retail: number
  }
}

export interface TenantCurrencyInfo {
  currencyId: string | null
  currencyCode: string
  currencySymbol: string
  currencyName?: string | null
}

export interface ValuationResponse {
  items: ValuationItemRow[]
  total: number
  page: number
  limit: number
  totalPages: number
  metrics: ValuationMetrics
  currency?: TenantCurrencyInfo
}

export interface ValuationFilterLookups {
  warehouses: Array<{ id: string; name: string; code: string | null }>
  stores: Array<{ id: string; name: string }>
  categories: Array<{ id: string; name: string }>
  suppliers: Array<{ id: string; name: string; code?: string | null }>
  currency?: TenantCurrencyInfo
}

/**
 * Resolve tenant's default currency ID and symbol from the database
 */
export async function resolveTenantDefaultCurrency(
  tenantId: string
): Promise<TenantCurrencyInfo> {
  const fallbackCurrency: TenantCurrencyInfo = {
    currencyId: null,
    currencyCode: 'USD',
    currencySymbol: '$',
    currencyName: 'US Dollar',
  }

  try {
    const tenant = await prisma.tenants.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        currency_id: true,
        currency_code: true,
        currencies: {
          select: {
            id: true,
            code: true,
            symbol: true,
            name: true,
          },
        },
      },
    })

    if (!tenant) return fallbackCurrency

    let currency = tenant.currencies
    if (!currency && tenant.currency_id) {
      currency = await prisma.currencies.findUnique({
        where: { id: tenant.currency_id },
        select: { id: true, code: true, symbol: true, name: true },
      })
    }

    if (!currency && tenant.currency_code) {
      currency = await prisma.currencies.findFirst({
        where: { code: tenant.currency_code },
        select: { id: true, code: true, symbol: true, name: true },
      })
    }

    if (currency) {
      return {
        currencyId: currency.id || tenant.currency_id || null,
        currencyCode: currency.code || tenant.currency_code || 'USD',
        currencySymbol: currency.symbol || '$',
        currencyName: currency.name || null,
      }
    }

    if (tenant.currency_code) {
      return {
        currencyId: tenant.currency_id || null,
        currencyCode: tenant.currency_code,
        currencySymbol: tenant.currency_code,
        currencyName: null,
      }
    }
  } catch (err) {
    console.warn('Failed to resolve tenant default currency:', err)
  }

  return fallbackCurrency
}

/**
 * List inventory asset valuation rows with dynamic costing method, multi-table filters,
 * lazy search, server-side sorting and pagination.
 */
export async function listInventoryValuation(
  authUserId: string,
  filters: ValuationFilters = {}
): Promise<ValuationResponse> {
  const tenantId = await requireTenantId(authUserId)

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    const method = filters.valuationMethod || 'avco'
    const page = Math.max(1, filters.page || 1)
    const limit = Math.min(200, Math.max(1, filters.limit || 25))

    // Base query filter with tenant isolation
    const where: Prisma.stock_balancesWhereInput = {
      tenant_id: tenantId,
    }

    if (filters.warehouseId && filters.warehouseId !== 'all') {
      where.warehouse_id = filters.warehouseId
    }

    if (filters.storeId && filters.storeId !== 'all') {
      where.store_id = filters.storeId
    }

    if (filters.condition && filters.condition !== 'all') {
      where.condition = filters.condition as stock_condition_enum
    }

    // Free-text lazy search across SKU, Barcode, or Product Name
    const productVariantConditions: Prisma.product_variantsWhereInput = {}
    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim()
      productVariantConditions.OR = [
        { sku: { contains: q, mode: 'insensitive' } },
        { barcode: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
        { products: { name: { contains: q, mode: 'insensitive' } } },
      ]
    }

    // Category or Supplier filter through product relations
    const productConditions: Prisma.productsWhereInput = {}
    if (filters.categoryId && filters.categoryId !== 'all') {
      productConditions.category_id = filters.categoryId
    }
    if (filters.supplierId && filters.supplierId !== 'all') {
      productConditions.supplier_id = filters.supplierId
    }

    if (Object.keys(productConditions).length > 0) {
      productVariantConditions.products = productConditions
    }

    if (Object.keys(productVariantConditions).length > 0) {
      where.product_variants = productVariantConditions
    }

    // Fetch tenant default currency & matching stock balance records
    const [tenantCurrency, rawBalances] = await Promise.all([
      resolveTenantDefaultCurrency(tenantId),
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
                  category_id: true,
                  supplier_id: true,
                  categories: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                  suppliers: {
                    select: {
                      id: true,
                      name: true,
                      code: true,
                    },
                  },
                },
              },
              price_list_items: {
                select: {
                  price: true,
                  cost_price: true,
                },
                take: 1,
              },
            },
          },
          warehouses: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          warehouse_locations: {
            select: {
              id: true,
              name: true,
              code: true,
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
      }),
    ])

    // Process each record and calculate valuation metrics
    let grandAvcoTotal = 0
    let grandStandardTotal = 0
    let grandFifoTotal = 0
    let grandRetailTotal = 0
    let grandUnits = 0
    let lowStockCount = 0
    let outOfStockCount = 0

    const mappedRows: ValuationItemRow[] = rawBalances.map((b) => {
      const v = b.product_variants
      const pli = v?.price_list_items?.[0]

      const onHand = Number(b.qty_on_hand || 0)
      const reserved = Number(b.qty_reserved || 0)
      const computedAvailable =
        b.qty_available !== null && b.qty_available !== undefined
          ? Number(b.qty_available)
          : Math.max(0, onHand - reserved)

      const reorderLevel = 10

      // Costs
      const avcoCost = Number(b.avg_cost ?? pli?.cost_price ?? 0)
      const standardCost = Number(pli?.cost_price ?? b.avg_cost ?? 0)
      const sellingPrice = Number(pli?.price ?? 0)

      // Fallback heuristics if cost is zero
      const safeAvco =
        avcoCost > 0 ? avcoCost : sellingPrice > 0 ? sellingPrice * 0.7 : 0
      const safeStandard = standardCost > 0 ? standardCost : safeAvco
      // FIFO estimate: slightly adjusted or latest cost
      const safeFifo = safeAvco > 0 ? safeAvco : safeStandard

      // Chosen unit cost based on active method
      let unitCost = safeAvco
      if (method === 'standard') {
        unitCost = safeStandard
      } else if (method === 'fifo') {
        unitCost = safeFifo
      } else if (method === 'retail') {
        unitCost = sellingPrice
      }

      const totalValue = onHand * unitCost
      const potentialRevenue = onHand * sellingPrice
      const potentialMargin =
        potentialRevenue > 0
          ? ((potentialRevenue - onHand * safeAvco) / potentialRevenue) * 100
          : 0

      // Stock status
      let stockStatus: ValuationItemRow['stockStatus'] = 'in_stock'
      if (onHand <= 0) {
        stockStatus = 'out_of_stock'
        outOfStockCount += 1
      } else if (onHand <= reorderLevel) {
        stockStatus = 'low_stock'
        lowStockCount += 1
      }

      grandAvcoTotal += onHand * safeAvco
      grandStandardTotal += onHand * safeStandard
      grandFifoTotal += onHand * safeFifo
      grandRetailTotal += potentialRevenue
      grandUnits += onHand

      return {
        id: b.id,
        balanceId: b.id,
        warehouseId: b.warehouse_id,
        warehouseName: b.warehouses?.name || null,
        warehouseCode: b.warehouses?.code || null,
        storeId: b.store_id,
        storeName: b.stores?.name || null,
        locationId: b.location_id,
        locationName: b.warehouse_locations?.name || null,
        locationCode: b.warehouse_locations?.code || null,
        variantId: b.product_variant_id,
        sku: v?.sku || b.product_variant_id.slice(0, 8),
        barcode: v?.barcode || null,
        productName: v?.products?.name || v?.name || '—',
        productId: v?.products?.id || '',
        categoryId: v?.products?.category_id || null,
        categoryName: v?.products?.categories?.name || 'Uncategorized',
        supplierId: v?.products?.supplier_id || null,
        supplierName: v?.products?.suppliers?.name || null,
        condition: b.condition || 'good',
        onHand,
        reserved,
        available: computedAvailable,
        reorderLevel,
        avcoUnitCost: safeAvco,
        standardUnitCost: safeStandard,
        fifoUnitCost: safeFifo,
        unitCost,
        sellingPrice,
        totalValue,
        potentialRevenue,
        potentialMargin,
        sharePercent: 0, // Will be computed after total
        lastMovementAt: b.last_movement_at
          ? b.last_movement_at.toISOString()
          : null,
        stockStatus,
        currencySymbol: tenantCurrency.currencySymbol,
      }
    })

    // Active method grand total
    let activeTotalValuation = grandAvcoTotal
    if (method === 'standard') activeTotalValuation = grandStandardTotal
    else if (method === 'fifo') activeTotalValuation = grandFifoTotal
    else if (method === 'retail') activeTotalValuation = grandRetailTotal

    // Compute share percentages
    for (const row of mappedRows) {
      row.sharePercent =
        activeTotalValuation > 0
          ? (row.totalValue / activeTotalValuation) * 100
          : 0
    }

    // Filter by stockStatus if specified
    let filteredRows = mappedRows
    if (filters.stockStatus && filters.stockStatus !== 'all') {
      if (filters.stockStatus === 'out_of_stock') {
        filteredRows = mappedRows.filter(
          (r) => r.stockStatus === 'out_of_stock'
        )
      } else if (filters.stockStatus === 'low_stock') {
        filteredRows = mappedRows.filter((r) => r.stockStatus === 'low_stock')
      } else if (filters.stockStatus === 'in_stock') {
        filteredRows = mappedRows.filter((r) => r.stockStatus === 'in_stock')
      } else if (filters.stockStatus === 'high_value') {
        // Top 20% highest value rows or value > $500
        const sortedByVal = [...mappedRows].sort(
          (a, b) => b.totalValue - a.totalValue
        )
        const thresholdIndex = Math.max(1, Math.floor(sortedByVal.length * 0.2))
        const highValueThreshold =
          sortedByVal[thresholdIndex]?.totalValue || 500
        filteredRows = mappedRows.filter(
          (r) => r.totalValue >= highValueThreshold
        )
      }
    }

    // Sort rows
    const sortBy = filters.sortBy || 'totalValue'
    const sortOrder = filters.sortOrder || 'desc'
    const multiplier = sortOrder === 'asc' ? 1 : -1

    filteredRows.sort((a, b) => {
      let valA: number | string = a.totalValue
      let valB: number | string = b.totalValue

      switch (sortBy) {
        case 'onHand':
          valA = a.onHand
          valB = b.onHand
          break
        case 'unitCost':
          valA = a.unitCost
          valB = b.unitCost
          break
        case 'productName':
          valA = a.productName.toLowerCase()
          valB = b.productName.toLowerCase()
          break
        case 'sku':
          valA = a.sku.toLowerCase()
          valB = b.sku.toLowerCase()
          break
        case 'potentialRevenue':
          valA = a.potentialRevenue
          valB = b.potentialRevenue
          break
        case 'potentialMargin':
          valA = a.potentialMargin
          valB = b.potentialMargin
          break
        case 'totalValue':
        default:
          valA = a.totalValue
          valB = b.totalValue
          break
      }

      if (typeof valA === 'string' && typeof valB === 'string') {
        return multiplier * valA.localeCompare(valB)
      }
      return multiplier * ((valA as number) - (valB as number))
    })

    // Pagination slice
    const totalCount = filteredRows.length
    const totalPages = Math.ceil(totalCount / limit) || 1
    const offset = (page - 1) * limit
    const paginatedItems = filteredRows.slice(offset, offset + limit)

    // Summary metrics
    const averageMargin =
      grandRetailTotal > 0
        ? ((grandRetailTotal - grandAvcoTotal) / grandRetailTotal) * 100
        : 0

    const metrics: ValuationMetrics = {
      totalValuation: activeTotalValuation,
      totalUnits: grandUnits,
      totalPotentialRevenue: grandRetailTotal,
      averageMargin,
      lowStockCount,
      outOfStockCount,
      totalLines: mappedRows.length,
      methodTotals: {
        avco: grandAvcoTotal,
        standard: grandStandardTotal,
        fifo: grandFifoTotal,
        retail: grandRetailTotal,
      },
    }

    return {
      items: paginatedItems,
      total: totalCount,
      page,
      limit,
      totalPages,
      metrics,
      currency: tenantCurrency,
    }
  })
}

/**
 * Fetch filter lookups from real database tables (warehouses, stores, categories, suppliers)
 * for the authenticated tenant.
 */
export async function getValuationFilterLookups(
  authUserId: string
): Promise<ValuationFilterLookups> {
  const tenantId = await requireTenantId(authUserId)

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    const [tenantCurrency, warehouses, stores, categories, suppliers] =
      await Promise.all([
        resolveTenantDefaultCurrency(tenantId),
        prisma.warehouses.findMany({
          where: { tenant_id: tenantId, is_active: true },
          select: { id: true, name: true, code: true },
          orderBy: { name: 'asc' },
        }),
        prisma.stores.findMany({
          where: { tenant_id: tenantId, status: true },
          select: { store_id: true, name: true },
          orderBy: { name: 'asc' },
        }),
        prisma.categories.findMany({
          where: { tenant_id: tenantId },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        }),
        prisma.suppliers.findMany({
          where: { tenant_id: tenantId, is_active: true },
          select: { id: true, name: true, code: true },
          orderBy: { name: 'asc' },
        }),
      ])

    return {
      warehouses: warehouses.map((w) => ({
        id: w.id,
        name: w.name,
        code: w.code,
      })),
      stores: stores.map((s) => ({ id: s.store_id, name: s.name || 'Store' })),
      categories: categories.map((c) => ({ id: c.id, name: c.name })),
      suppliers: suppliers.map((s) => ({
        id: s.id,
        name: s.name,
        code: s.code,
      })),
      currency: tenantCurrency,
    }
  })
}
