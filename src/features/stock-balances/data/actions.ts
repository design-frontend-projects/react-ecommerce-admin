import { authorizedRequest, type TokenGetter } from '@/lib/authorized-request'
import { supabase } from '@/lib/supabase'
import { resolveClientTenantId } from '@/lib/client-tenant'
import type {
  StockBalancesResponse,
  StockBalanceRow,
  StockBalanceFilters,
  StockMovementRow,
} from './schema'
import type { AdjustmentFormData } from './adjustment-schema'

const BASE = '/api/inventory/stock-balances'

/**
 * Fetch stock balances via server API route with tenant isolation & Prisma 7.
 * Seamlessly falls back to Supabase client query with tenant filter if API route is not available.
 */
export async function fetchStockBalances(
  getToken: TokenGetter,
  filters: StockBalanceFilters = {}
): Promise<StockBalancesResponse> {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value))
    }
  }

  const query = params.toString()
  const endpoint = query ? `${BASE}?${query}` : BASE

  try {
    const payload = await authorizedRequest(getToken, endpoint)
    if (payload && (payload as StockBalancesResponse).items) {
      return payload as StockBalancesResponse
    }
  } catch (err) {
    console.warn('API route /api/inventory/stock-balances unavailable, using Supabase client fallback:', err)
  }

  // Fallback: Direct Supabase query with tenant isolation
  const tenantId = await resolveClientTenantId()
  let sbQuery = supabase
    .from('stock_balances')
    .select(
      `
      *,
      product_variants (
        id,
        sku,
        barcode,
        name,
        products (
          id,
          name,
          sku,
          is_batch_tracked,
          is_serial_tracked,
          reorder_level
        )
      ),
      warehouses (
        id,
        name,
        code
      ),
      warehouse_locations (
        id,
        name,
        code,
        location_type
      ),
      stores (
        store_id,
        name
      )
    `
    )
    .order('updated_at', { ascending: false })

  if (tenantId) {
    sbQuery = sbQuery.eq('tenant_id', tenantId)
  }
  if (filters.warehouseId) {
    sbQuery = sbQuery.eq('warehouse_id', filters.warehouseId)
  }
  if (filters.storeId) {
    sbQuery = sbQuery.eq('store_id', filters.storeId)
  }
  if (filters.locationId) {
    sbQuery = sbQuery.eq('location_id', filters.locationId)
  }
  if (filters.condition) {
    sbQuery = sbQuery.eq('condition', filters.condition)
  }

  const { data, error } = await sbQuery
  if (error) throw error

  const rawRows = (data ?? []) as unknown as StockBalanceRow[]

  let totalOnHand = 0
  let totalReserved = 0
  let totalAvailable = 0
  let totalValuation = 0
  let lowStockCount = 0
  let outOfStockCount = 0
  const uniqueVariants = new Set<string>()

  const items: StockBalanceRow[] = rawRows.map((row) => {
    uniqueVariants.add(row.product_variant_id)
    const onHand = Number(row.qty_on_hand || 0)
    const reserved = Number(row.qty_reserved || 0)
    const available =
      row.qty_available !== null && row.qty_available !== undefined
        ? Number(row.qty_available)
        : Math.max(0, onHand - reserved)
    const avgCost = Number(row.avg_cost || 0)
    const valuation = onHand * avgCost
    const reorderLevel = 10

    totalOnHand += onHand
    totalReserved += reserved
    totalAvailable += available
    totalValuation += valuation

    if (onHand <= 0) {
      outOfStockCount += 1
    } else if (onHand <= reorderLevel) {
      lowStockCount += 1
    }

    return {
      ...row,
      qty_on_hand: onHand,
      qty_reserved: reserved,
      qty_available: available,
      avg_cost: avgCost,
      valuation,
    }
  })

  return {
    success: true,
    items,
    total: items.length,
    metrics: {
      totalVariants: uniqueVariants.size,
      totalOnHand,
      totalReserved,
      totalAvailable,
      totalValuation,
      lowStockCount,
      outOfStockCount,
    },
  }
}

/**
 * Apply single-line manual stock adjustment.
 * Sends payload to server route, or executes RPC / movement engine fallback.
 */
export async function postStockAdjustment(
  getToken: TokenGetter,
  values: AdjustmentFormData
) {
  const payload = {
    warehouseId: values.location_type === 'warehouse' ? values.warehouse_id : null,
    locationId: values.location_type === 'warehouse' ? values.location_id : null,
    storeId: values.location_type === 'store' ? values.store_id : null,
    productVariantId: values.product_variant_id,
    condition: values.condition,
    adjustmentType: values.adjustment_type,
    quantity: values.quantity,
    unitCost: values.unit_cost,
    reasonCode: values.reason_code,
    reason: values.reason,
    batchId: values.batch_id,
    serialId: values.serial_id,
  }

  try {
    const res = await authorizedRequest(getToken, BASE, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return res
  } catch (err) {
    console.warn('API route POST /api/inventory/stock-balances failed, attempting fallback RPC:', err)
  }

  // Fallback to Supabase RPC if available
  if (values.location_type === 'store' && values.store_id) {
    const { data, error } = await supabase.rpc('adjust_stock_balance', {
      p_store_id: values.store_id,
      p_product_variant_id: values.product_variant_id,
      p_adjustment_type: values.adjustment_type,
      p_quantity: values.quantity,
      p_reason: `${values.reason_code}: ${values.reason}`,
    })
    if (error) throw error
    return data
  }

  throw new Error('Adjustment could not be processed for the selected location.')
}

/**
 * Fetch movements for a specific stock balance / product variant.
 */
export async function fetchStockBalanceMovements(
  getToken: TokenGetter,
  variantId: string,
  facility?: { warehouseId?: string | null; storeId?: string | null }
): Promise<StockMovementRow[]> {
  const params = new URLSearchParams({ productVariantId: variantId, limit: '50' })
  if (facility?.warehouseId) {
    params.set('warehouseId', facility.warehouseId)
  }
  if (facility?.storeId) {
    params.set('storeId', facility.storeId)
  }

  try {
    const res = (await authorizedRequest(
      getToken,
      `/api/inventory/movements?${params.toString()}`
    )) as { success: boolean; data: StockMovementRow[] }
    if (res?.data) {
      return res.data
    }
  } catch (err) {
    console.warn('Failed to fetch movements from API, querying Supabase directly:', err)
  }

  // Fallback
  let q = supabase
    .from('inventory_movements')
    .select('*')
    .eq('product_variant_id', variantId)
    .order('movement_date', { ascending: false })
    .limit(50)

  if (facility?.warehouseId) {
    q = q.eq('warehouse_id', facility.warehouseId)
  }
  if (facility?.storeId) {
    q = q.eq('store_id', facility.storeId)
  }

  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as unknown as StockMovementRow[]
}
