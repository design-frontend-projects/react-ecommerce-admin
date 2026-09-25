'use server'

import { requireTenantId } from '@/server/utils/tenant'
import { runWithTenantContext } from '@/server/context/tenant-context'
import prisma from '@/lib/prisma'

export interface MovementFilters {
  page?: number
  pageSize?: number
  search?: string
  movementType?: string
  warehouseId?: string
  storeId?: string
  locationId?: string
  productVariantId?: string
  referenceType?: string
  dateFrom?: string
  dateTo?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  limit?: number
  export?: string
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

const ALLOWED_SORT_FIELDS = new Set([
  'movement_date',
  'quantity_delta',
  'unit_cost',
  'total_cost',
  'created_at',
])

/**
 * Read the inventory movement ledger for the authenticated user's tenant.
 * Strictly scoped by `tenant_id`. Supports server-side pagination, debounced
 * multi-field search, filtering, and aggregate summary metrics.
 */
export async function listMovements(
  authUserId: string,
  filters: MovementFilters = {}
) {
  const tenantId = await requireTenantId(authUserId)

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    const isExport = filters.export === 'csv'
    const page = Math.max(1, filters.page ?? 1)
    const pageSize = isExport
      ? 5000
      : Math.min(Math.max(1, filters.pageSize ?? filters.limit ?? 20), 100)
    const skip = isExport ? 0 : (page - 1) * pageSize
    const take = pageSize

    const sortOrder = filters.sortOrder === 'asc' ? 'asc' : 'desc'
    let sortField =
      filters.sortBy && ALLOWED_SORT_FIELDS.has(filters.sortBy)
        ? filters.sortBy
        : 'movement_date'
    if (
      filters.sortBy === 'qty_in' ||
      filters.sortBy === 'qty_out' ||
      filters.sortBy === 'qty'
    ) {
      sortField = 'quantity_delta'
    }

    const where: Record<string, unknown> = {
      tenant_id: tenantId,
    }

    if (filters.movementType && MOVEMENT_TYPES.has(filters.movementType)) {
      where.movement_type = filters.movementType
    }

    if (filters.locationId) {
      where.OR = [
        { warehouse_id: filters.locationId },
        { store_id: filters.locationId },
        { warehouse_location_id: filters.locationId },
        { location_id: filters.locationId },
      ]
    } else if (
      filters.warehouseId &&
      filters.storeId &&
      filters.warehouseId === filters.storeId
    ) {
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

    // Text search matching SKU, barcode, variant name, reference, remarks
    if (filters.search && filters.search.trim()) {
      const searchTerm = filters.search.trim()
      let variantIdsFromSearch: string[] = []

      if (typeof prisma.product_variants?.findMany === 'function') {
        try {
          const variants = await prisma.product_variants.findMany({
            where: {
              tenant_id: tenantId,
              OR: [
                { sku: { contains: searchTerm, mode: 'insensitive' } },
                { barcode: { contains: searchTerm, mode: 'insensitive' } },
                { name: { contains: searchTerm, mode: 'insensitive' } },
              ],
            },
            select: { id: true },
          })
          variantIdsFromSearch = variants.map((v) => v.id)
        } catch {
          // ignore error if table or query fails
        }
      }

      const searchOr: Record<string, unknown>[] = [
        { remarks: { contains: searchTerm, mode: 'insensitive' } },
        { notes: { contains: searchTerm, mode: 'insensitive' } },
        { reference_type: { contains: searchTerm, mode: 'insensitive' } },
      ]

      if (variantIdsFromSearch.length > 0) {
        searchOr.push({ product_variant_id: { in: variantIdsFromSearch } })
      }

      const numericSearch = Number(searchTerm)
      if (!isNaN(numericSearch) && Number.isInteger(numericSearch)) {
        searchOr.push({ movement_no: BigInt(numericSearch) })
      }

      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (uuidRegex.test(searchTerm)) {
        searchOr.push({ reference_id: searchTerm })
        searchOr.push({ id: searchTerm })
      }

      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchOr }]
        delete where.OR
      } else {
        where.OR = searchOr
      }
    }

    const [movements, rawCount, inAgg, outAgg] = await Promise.all([
      prisma.inventory_movements.findMany({
        where,
        orderBy: [{ [sortField]: sortOrder }, { id: 'desc' }],
        skip,
        take,
      }),
      typeof prisma.inventory_movements?.count === 'function'
        ? prisma.inventory_movements.count({ where }).catch(() => null)
        : Promise.resolve(null),
      typeof prisma.inventory_movements?.aggregate === 'function'
        ? prisma.inventory_movements
            .aggregate({
              where: {
                ...where,
                quantity_delta: { gt: 0 },
              },
              _sum: { quantity_delta: true },
            })
            .catch(() => null)
        : Promise.resolve(null),
      typeof prisma.inventory_movements?.aggregate === 'function'
        ? prisma.inventory_movements
            .aggregate({
              where: {
                ...where,
                quantity_delta: { lt: 0 },
              },
              _sum: { quantity_delta: true },
            })
            .catch(() => null)
        : Promise.resolve(null),
    ])

    const totalCount = rawCount ?? movements.length
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

    let totalIn = inAgg?._sum?.quantity_delta
      ? Number(inAgg._sum.quantity_delta)
      : 0
    let totalOut = outAgg?._sum?.quantity_delta
      ? Math.abs(Number(outAgg._sum.quantity_delta))
      : 0

    // Fallback if aggregate wasn't available
    if (!inAgg && !outAgg && movements.length) {
      totalIn = movements.reduce((acc, m) => {
        const d = Number(m.quantity_delta ?? 0)
        return acc + (d > 0 ? d : 0)
      }, 0)
      totalOut = movements.reduce((acc, m) => {
        const d = Number(m.quantity_delta ?? 0)
        return acc + (d < 0 ? Math.abs(d) : 0), 0
      }, 0)
    }

    const netDelta = totalIn - totalOut

    if (!movements.length) {
      const emptyResult = {
        movements: [],
        totalCount: 0,
        page,
        pageSize,
        totalPages: 1,
        summary: {
          totalMovements: 0,
          totalIn: 0,
          totalOut: 0,
          netDelta: 0,
        },
      }
      Object.defineProperties(emptyResult, {
        length: { value: 0, enumerable: false },
        [Symbol.iterator]: {
          value: function* () {},
          enumerable: false,
        },
      })
      return emptyResult
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

    const [variants, warehouses, stores, branches, locations] =
      await Promise.all([
        variantIds.length &&
        typeof prisma.product_variants?.findMany === 'function'
          ? prisma.product_variants.findMany({
              where: { id: { in: variantIds } },
              select: { id: true, sku: true, barcode: true, name: true },
            })
          : [],
        warehouseIds.length &&
        typeof prisma.warehouses?.findMany === 'function'
          ? prisma.warehouses.findMany({
              where: { id: { in: warehouseIds } },
              select: { id: true, name: true, code: true },
            })
          : [],
        storeIds.length && typeof prisma.stores?.findMany === 'function'
          ? prisma.stores.findMany({
              where: { store_id: { in: storeIds } },
              select: { store_id: true, name: true },
            })
          : [],
        branchIds.length && typeof prisma.branches?.findMany === 'function'
          ? prisma.branches.findMany({
              where: { id: { in: branchIds } },
              select: { id: true, name: true },
            })
          : [],
        locationIds.length &&
        typeof prisma.warehouse_locations?.findMany === 'function'
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

    const mappedMovements = movements.map((m) => {
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
        warehouses: m.warehouse_id
          ? warehouseMap.get(m.warehouse_id) ?? null
          : null,
        stores: m.store_id ? storeMap.get(m.store_id) ?? null : null,
        branches: m.branch_id ? branchMap.get(m.branch_id) ?? null : null,
        warehouse_locations: locId ? locationMap.get(locId) ?? null : null,
      }
    })

    const finalResult = {
      movements: mappedMovements,
      totalCount,
      page,
      pageSize,
      totalPages,
      summary: {
        totalMovements: totalCount,
        totalIn,
        totalOut,
        netDelta,
      },
    }

    // Attach non-enumerable properties for backward compatibility with array consumers & unit tests
    Object.defineProperties(finalResult, {
      length: {
        get() {
          return mappedMovements.length
        },
        enumerable: false,
      },
      [Symbol.iterator]: {
        value: function* () {
          yield* mappedMovements
        },
        enumerable: false,
      },
    })
    mappedMovements.forEach((item, index) => {
      Object.defineProperty(finalResult, index, {
        value: item,
        enumerable: false,
        configurable: true,
      })
    })

    return finalResult
  })
}
