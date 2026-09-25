import { z } from 'zod'
import { authorizedRequest, type TokenGetter } from '@/lib/authorized-request'
import { supabase } from '@/lib/supabase'
import {
  movementRowSchema,
  paginatedMovementsResponseSchema,
  paginatedMovementsDataSchema,
  movementsResponseSchema,
  type MovementFilters,
  type MovementRow,
  type PaginatedMovementsResult,
} from './schema'

const BASE = '/api/inventory/movements'

function wrapWithArrayCompat(result: PaginatedMovementsResult): PaginatedMovementsResult {
  Object.defineProperties(result, {
    length: {
      get() {
        return result.movements.length
      },
      enumerable: false,
    },
    [Symbol.iterator]: {
      value: function* () {
        yield* result.movements
      },
      enumerable: false,
    },
  })
  result.movements.forEach((item, index) => {
    Object.defineProperty(result, index, {
      value: item,
      enumerable: false,
      configurable: true,
    })
  })
  return result
}

export async function fetchMovements(
  getToken: TokenGetter,
  filters: MovementFilters = {}
): Promise<PaginatedMovementsResult> {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value))
    }
  }
  const query = params.toString()

  try {
    const payload = await authorizedRequest(
      getToken,
      query ? `${BASE}?${query}` : BASE
    )

    // 1. Envelope response with paginated movements data: { success: true, data: { movements: [...] } }
    const paginatedResponse = paginatedMovementsResponseSchema.safeParse(payload)
    if (paginatedResponse.success) {
      return wrapWithArrayCompat(paginatedResponse.data.data)
    }

    // 2. Direct paginated movements data: { movements: [...], totalCount: ... }
    const paginatedDirect = paginatedMovementsDataSchema.safeParse(payload)
    if (paginatedDirect.success) {
      return wrapWithArrayCompat(paginatedDirect.data)
    }

    // 3. Envelope response with flat movements array: { success: true, data: MovementRow[] }
    const flatResponse = movementsResponseSchema.safeParse(payload)
    if (flatResponse.success) {
      const parsedRows = flatResponse.data.data
      const totalIn = parsedRows.reduce((acc, r) => acc + (r.qty_in ?? 0), 0)
      const totalOut = parsedRows.reduce((acc, r) => acc + (r.qty_out ?? 0), 0)
      const result: PaginatedMovementsResult = {
        movements: parsedRows,
        totalCount: parsedRows.length,
        page: filters.page ?? 1,
        pageSize: filters.pageSize ?? parsedRows.length,
        totalPages: 1,
        summary: {
          totalMovements: parsedRows.length,
          totalIn,
          totalOut,
          netDelta: totalIn - totalOut,
        },
      }
      return wrapWithArrayCompat(result)
    }

    // 4. Direct flat movements array: MovementRow[]
    const directArray = z.array(movementRowSchema).safeParse(payload)
    if (directArray.success) {
      const parsedRows = directArray.data
      const totalIn = parsedRows.reduce((acc, r) => acc + (r.qty_in ?? 0), 0)
      const totalOut = parsedRows.reduce((acc, r) => acc + (r.qty_out ?? 0), 0)
      const result: PaginatedMovementsResult = {
        movements: parsedRows,
        totalCount: parsedRows.length,
        page: filters.page ?? 1,
        pageSize: filters.pageSize ?? parsedRows.length,
        totalPages: 1,
        summary: {
          totalMovements: parsedRows.length,
          totalIn,
          totalOut,
          netDelta: totalIn - totalOut,
        },
      }
      return wrapWithArrayCompat(result)
    }

    return wrapWithArrayCompat({
      movements: [],
      totalCount: 0,
      page: 1,
      pageSize: 20,
      totalPages: 1,
      summary: { totalMovements: 0, totalIn: 0, totalOut: 0, netDelta: 0 },
    })
  } catch {
    const page = Math.max(1, filters.page ?? 1)
    const pageSize = Math.min(Math.max(1, filters.pageSize ?? filters.limit ?? 20), 100)
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let q = supabase
      .from('inventory_movements')
      .select(
        `
        *,
        product_variants (
          id,
          sku,
          barcode,
          name
        ),
        stores (
          store_id,
          name
        ),
        warehouses (
          id,
          name,
          code
        )
      `,
        { count: 'exact' }
      )
      .order('movement_date', { ascending: filters.sortOrder === 'asc' })
      .range(from, to)

    if (filters.movementType && filters.movementType !== 'all') {
      q = q.eq('movement_type', filters.movementType)
    }
    if (filters.warehouseId && filters.warehouseId !== 'all') {
      q = q.eq('warehouse_id', filters.warehouseId)
    }
    if (filters.storeId && filters.storeId !== 'all') {
      q = q.eq('store_id', filters.storeId)
    }
    if (filters.productVariantId) {
      q = q.eq('product_variant_id', filters.productVariantId)
    }
    if (filters.dateFrom) {
      q = q.gte('movement_date', filters.dateFrom)
    }
    if (filters.dateTo) {
      q = q.lte('movement_date', filters.dateTo)
    }

    const { data, count, error } = await q
    if (error) {
      const { data: flatData, count: flatCount, error: flatError } = await supabase
        .from('inventory_movements')
        .select('*', { count: 'exact' })
        .order('movement_date', { ascending: filters.sortOrder === 'asc' })
        .range(from, to)

      if (flatError) {
        throw flatError
      }
      const movements: MovementRow[] = (flatData ?? []).map((row: unknown) =>
        movementRowSchema.parse(row)
      )
      const totalCount = flatCount ?? movements.length
      const totalIn = movements.reduce((acc, r) => acc + (r.qty_in ?? 0), 0)
      const totalOut = movements.reduce((acc, r) => acc + (r.qty_out ?? 0), 0)

      return wrapWithArrayCompat({
        movements,
        totalCount,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
        summary: {
          totalMovements: totalCount,
          totalIn,
          totalOut,
          netDelta: totalIn - totalOut,
        },
      })
    }

    const movements: MovementRow[] = (data ?? []).map((row: unknown) =>
      movementRowSchema.parse(row)
    )
    const totalCount = count ?? movements.length
    const totalIn = movements.reduce((acc, r) => acc + (r.qty_in ?? 0), 0)
    const totalOut = movements.reduce((acc, r) => acc + (r.qty_out ?? 0), 0)

    return wrapWithArrayCompat({
      movements,
      totalCount,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
      summary: {
        totalMovements: totalCount,
        totalIn,
        totalOut,
        netDelta: totalIn - totalOut,
      },
    })
  }
}
