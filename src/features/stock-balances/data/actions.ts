import { authorizedRequest, type TokenGetter } from '@/lib/authorized-request'
import { supabase } from '@/lib/supabase'
import { resolveClientTenantId } from '@/lib/client-tenant'
import type {
  StockBalancesResponse,
  StockBalanceRow,
  StockBalanceFilters,
  StockMovementRow,
  VariantSearchResponse,
  VariantSearchResult,
  VariantFacilityOnHandParams,
  VariantFacilityOnHandResult,
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
      if (Array.isArray(value)) {
        params.set(key, value.join(','))
      } else {
        params.set(key, String(value))
      }
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
    // eslint-disable-next-line no-console
    console.warn('API route /api/inventory/stock-balances unavailable, using Supabase client fallback:', err)
  }

  // Fallback: Direct Supabase query with tenant isolation
  const tenantId = await resolveClientTenantId()
  const pageSize = Math.min(Math.max(1, filters.pageSize ?? filters.limit ?? 20), 100)
  const page = Math.max(
    1,
    filters.page ?? (filters.offset !== undefined ? Math.floor(filters.offset / pageSize) + 1 : 1)
  )
  const skip = (page - 1) * pageSize

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
    `,
      { count: 'exact' }
    )

  if (filters.sortBy === 'qty_on_hand') {
    sbQuery = sbQuery.order('qty_on_hand', { ascending: filters.sortOrder === 'asc' })
  } else {
    sbQuery = sbQuery.order('updated_at', { ascending: filters.sortOrder === 'asc' })
  }

  if (tenantId) {
    sbQuery = sbQuery.eq('tenant_id', tenantId)
  }
  if (filters.facilityType === 'warehouses') {
    sbQuery = sbQuery.not('warehouse_id', 'is', null)
  } else if (filters.facilityType === 'stores') {
    sbQuery = sbQuery.not('store_id', 'is', null)
  }

  if (filters.warehouseIds && filters.warehouseIds.length > 0) {
    sbQuery = sbQuery.in('warehouse_id', filters.warehouseIds)
  } else if (filters.warehouseId) {
    sbQuery = sbQuery.eq('warehouse_id', filters.warehouseId)
  }
  if (filters.storeId) {
    sbQuery = sbQuery.eq('store_id', filters.storeId)
  }
  if (filters.locationId) {
    sbQuery = sbQuery.eq('location_id', filters.locationId)
  }
  if (filters.productVariantId) {
    sbQuery = sbQuery.eq('product_variant_id', filters.productVariantId)
  }
  if (filters.condition) {
    sbQuery = sbQuery.eq('condition', filters.condition)
  }
  if (filters.stockStatus === 'out_of_stock') {
    sbQuery = sbQuery.lte('qty_on_hand', 0)
  } else if (filters.stockStatus === 'low_stock') {
    sbQuery = sbQuery.gt('qty_on_hand', 0).lte('qty_on_hand', 10)
  } else if (filters.stockStatus === 'in_stock') {
    sbQuery = sbQuery.gt('qty_on_hand', 10)
  }

  // Range pagination
  sbQuery = sbQuery.range(skip, skip + pageSize - 1)

  const { data, count, error } = await sbQuery
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

  const total = count ?? items.length
  const totalPages = Math.ceil(total / pageSize)

  return {
    success: true,
    items,
    total,
    page,
    pageSize,
    totalPages,
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
 * Dynamic server-side product variant SKU search with 300ms debounce.
 * Falls back to Supabase client query with tenant scoping.
 */
export async function searchProductVariants(
  getToken: TokenGetter,
  search = '',
  limit = 25
): Promise<VariantSearchResponse> {
  const params = new URLSearchParams()
  if (search.trim()) {
    params.set('search', search.trim())
  }
  params.set('limit', String(limit))

  const endpoint = `/api/inventory/product-variants?${params.toString()}`

  try {
    const payload = (await authorizedRequest(getToken, endpoint)) as VariantSearchResponse
    if (payload?.items && Array.isArray(payload.items)) {
      return payload
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('API /api/inventory/product-variants unavailable, falling back to Supabase:', err)
  }

  // Supabase fallback
  const tenantId = await resolveClientTenantId()
  let query = supabase
    .from('product_variants')
    .select(`
      id,
      sku,
      barcode,
      name,
      products (
        id,
        name
      ),
      price_list_items (
        price,
        cost_price
      )
    `)
    .eq('is_active', true)
    .limit(Math.min(limit, 50))
    .order('sku')

  if (tenantId) {
    query = query.eq('tenant_id', tenantId)
  }
  if (search.trim()) {
    const term = search.trim()
    query = query.or(`sku.ilike.%${term}%,barcode.ilike.%${term}%,name.ilike.%${term}%`)
  }

  const { data, error } = await query
  if (error) throw error

  type RawVariant = {
    id: string
    sku: string
    barcode: string | null
    name: string | null
    products: { id?: string; name: string } | null
    price_list_items?: Array<{ price?: number | string | null; cost_price?: number | string | null }> | null
  }

  const items: VariantSearchResult[] = ((data ?? []) as unknown as RawVariant[]).map((row) => {
    const pli = row.price_list_items?.[0]
    return {
      id: row.id,
      sku: row.sku,
      barcode: row.barcode,
      name: row.name,
      product_name: row.products?.name ?? '',
      price: Number(pli?.price ?? 0),
      cost_price: pli?.cost_price != null ? Number(pli.cost_price) : null,
    }
  })

  return {
    success: true,
    items,
  }
}

/**
 * Targeted single variant facility on-hand balance resolution without loading entire catalogs.
 */
export async function fetchVariantFacilityOnHand(
  getToken: TokenGetter,
  params: VariantFacilityOnHandParams
): Promise<VariantFacilityOnHandResult> {
  const filters: StockBalanceFilters = {
    productVariantId: params.productVariantId,
    limit: 1,
    pageSize: 1,
    page: 1,
  }

  if (params.facilityType === 'warehouse') {
    filters.warehouseId = params.facilityId
  } else {
    filters.storeId = params.facilityId
  }

  const res = await fetchStockBalances(getToken, filters)
  const item = res.items?.[0]

  if (item) {
    return {
      product_variant_id: params.productVariantId,
      facility_id: params.facilityId,
      qty_on_hand: Number(item.qty_on_hand ?? 0),
      qty_reserved: Number(item.qty_reserved ?? 0),
      qty_available: Number(item.qty_available ?? Math.max(0, item.qty_on_hand - item.qty_reserved)),
      avg_cost: Number(item.avg_cost ?? 0),
    }
  }

  return {
    product_variant_id: params.productVariantId,
    facility_id: params.facilityId,
    qty_on_hand: 0,
    qty_reserved: 0,
    qty_available: 0,
    avg_cost: 0,
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
    // eslint-disable-next-line no-console
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
    // eslint-disable-next-line no-console
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
