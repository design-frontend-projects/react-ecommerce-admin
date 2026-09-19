import { authorizedRequest, type TokenGetter } from '@/lib/authorized-request'
import { supabase } from '@/lib/supabase'
import {
  movementsResponseSchema,
  type MovementFilters,
  type MovementRow,
} from './schema'

const BASE = '/api/inventory/movements'

export async function fetchMovements(
  getToken: TokenGetter,
  filters: MovementFilters = {}
): Promise<MovementRow[]> {
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
    return movementsResponseSchema.parse(payload).data
  } catch (err) {
    console.warn(
      'API route /api/inventory/movements failed, querying Supabase directly:',
      err
    )

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
      `
      )
      .order('movement_date', { ascending: false })
      .limit(filters.limit ?? 200)

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

    const { data, error } = await q
    if (error) {
      console.warn('Supabase relation query failed, attempting flat fallback:', error)
      const { data: flatData, error: flatError } = await supabase
        .from('inventory_movements')
        .select('*')
        .order('movement_date', { ascending: false })
        .limit(filters.limit ?? 200)

      if (flatError) {
        throw flatError
      }
      return movementsResponseSchema.parse({ success: true, data: flatData ?? [] }).data
    }

    return movementsResponseSchema.parse({ success: true, data: data ?? [] }).data
  }
}
