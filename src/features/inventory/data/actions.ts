/* eslint-disable no-console */
import { authorizedRequest, type TokenGetter } from '@/lib/authorized-request'
import { supabase } from '@/lib/supabase'
import { resolveClientTenantId } from '@/lib/client-tenant'
import type {
  Inventory,
  InventoryFilters,
  InventoryPaginatedResponse,
  InventoryMetrics,
} from './schema'

const BASE = '/api/inventory/items'

interface FallbackInventoryRow {
  id: string
  tenant_id: string
  product_variant_id: string
  sku: string
  barcode?: string | null
  is_stockable: boolean
  is_sellable: boolean
  is_purchasable: boolean
  tracking_type: string
  unit_of_measure_id?: string | null
  status: string
  is_active: boolean
  notes?: string | null
  created_at: string
  updated_at: string
  product_variants?: {
    id: string
    product_id: string
    name?: string | null
    sku: string
    barcode?: string | null
    weight?: number | null
    dimensions?: unknown
    is_active?: boolean
    price_list_items?: { price?: number | null; cost_price?: number | null }[]
    products?: {
      id: string
      name: string
      sku: string
      has_variants?: boolean
      barcode?: string | null
      categories?: { name: string } | null
      brands?: { name: string } | null
    } | null
  } | null
  uoms?: {
    id: string
    code: string
    name: string
    is_base?: boolean
    uom_category?: string | null
  } | null
}

interface FallbackStockBalanceRow {
  id: string
  product_variant_id: string
  qty_on_hand?: number | null
  qty_reserved?: number | null
  qty_available?: number | null
  avg_cost?: number | null
  condition?: string | null
  last_movement_at?: string | null
  warehouses?: { id: string; name: string; code: string } | null
  warehouse_locations?: { id: string; name: string; code: string; path?: string | null } | null
}

interface FallbackReorderRuleRow {
  id: string
  product_variant_id: string
  min_qty?: number | null
  max_qty?: number | null
  safety_stock?: number | null
  reorder_point?: number | null
  reorder_qty?: number | null
  lead_time_days?: number | null
  warehouses?: { id: string; name: string; code: string } | null
  stores?: { store_id: string; name: string } | null
}

/**
 * Fetch inventory items via server API route with tenant isolation & Prisma 7.
 * Seamlessly falls back to Supabase client query with tenant filter if API route is not available.
 */
export async function fetchInventoryItems(
  getToken: TokenGetter,
  filters: InventoryFilters = {}
): Promise<InventoryPaginatedResponse> {
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

  const queryString = params.toString()
  const endpoint = queryString ? `${BASE}?${queryString}` : BASE

  try {
    const payload = (await authorizedRequest(getToken, endpoint)) as {
      success?: boolean
      items?: Inventory[]
      totalCount?: number
      page?: number
      pageSize?: number
      totalPages?: number
      metrics?: InventoryMetrics
    }
    if (payload && Array.isArray(payload.items)) {
      return {
        items: payload.items,
        totalCount: payload.totalCount ?? payload.items.length,
        page: payload.page ?? filters.page ?? 1,
        pageSize: payload.pageSize ?? filters.pageSize ?? 20,
        totalPages:
          payload.totalPages ??
          Math.max(
            1,
            Math.ceil(
              (payload.totalCount ?? payload.items.length) /
                (payload.pageSize ?? filters.pageSize ?? 20)
            )
          ),
        metrics: payload.metrics,
      }
    }
  } catch (err) {
    console.warn(
      'API route /api/inventory/items unavailable, using Supabase client fallback:',
      err
    )
  }

  // Fallback: Supabase client query with tenant isolation
  const tenantId = await resolveClientTenantId()
  const page = Math.max(1, filters.page ?? 1)
  const pageSize = Math.min(Math.max(1, filters.pageSize ?? 20), 100)
  const skip = (page - 1) * pageSize

  let dbQuery = supabase.from('inventory_items').select(
    `
    id,
    tenant_id,
    product_variant_id,
    sku,
    barcode,
    is_stockable,
    is_sellable,
    is_purchasable,
    tracking_type,
    unit_of_measure_id,
    status,
    is_active,
    notes,
    created_at,
    updated_at,
    created_by_user_id,
    updated_by_user_id,
    product_variants (
      id,
      product_id,
      name,
      sku,
      barcode,
      weight,
      dimensions,
      is_active,
      price_list_items ( price, cost_price ),
      products (
        id,
        name,
        sku,
        has_variants,
        barcode,
        categories ( name ),
        brands ( name )
      )
    ),
    uoms (
      id,
      code,
      name,
      is_base,
      uom_category
    )
  `,
    { count: 'exact' }
  )

  if (tenantId) {
    dbQuery = dbQuery.eq('tenant_id', tenantId)
  }

  if (filters.trackingType && filters.trackingType !== 'all') {
    dbQuery = dbQuery.eq('tracking_type', filters.trackingType)
  }

  if (filters.search && filters.search.trim()) {
    const q = filters.search.trim()
    dbQuery = dbQuery.or(`sku.ilike.%${q}%,barcode.ilike.%${q}%`)
  }

  const {
    data: inventoryData,
    error,
    count,
  } = await dbQuery
    .order('created_at', { ascending: filters.sortOrder === 'asc' })
    .range(skip, skip + pageSize - 1)

  if (error) {
    console.error('Failed to fetch fallback inventory items:', error)
    throw error
  }

  const rawItems = (inventoryData as unknown as FallbackInventoryRow[]) || []
  const totalCount = count ?? rawItems.length

  // Fetch balances & reorder rules for mapping
  const variantIds = rawItems
    .map((i) => i.product_variant_id)
    .filter(Boolean)
  let balances: FallbackStockBalanceRow[] = []
  let rules: FallbackReorderRuleRow[] = []

  if (variantIds.length > 0) {
    let sbQ = supabase
      .from('stock_balances')
      .select(
        `
      id,
      product_variant_id,
      qty_on_hand,
      qty_reserved,
      qty_available,
      avg_cost,
      condition,
      warehouses ( id, name, code ),
      warehouse_locations ( id, name, code )
    `
      )
      .in('product_variant_id', variantIds)

    if (tenantId) sbQ = sbQ.eq('tenant_id', tenantId)

    let rrQ = supabase
      .from('reorder_rules')
      .select(
        `
      id,
      product_variant_id,
      min_qty,
      max_qty,
      safety_stock,
      reorder_point,
      reorder_qty,
      lead_time_days,
      warehouses ( id, name, code ),
      stores ( store_id, name )
    `
      )
      .in('product_variant_id', variantIds)

    if (tenantId) rrQ = rrQ.eq('tenant_id', tenantId)

    const [sbRes, rrRes] = await Promise.all([sbQ, rrQ])
    balances = (sbRes.data as unknown as FallbackStockBalanceRow[]) || []
    rules = (rrRes.data as unknown as FallbackReorderRuleRow[]) || []
  }

  const mapped: Inventory[] = rawItems.map((rawItem) => {
    const matchingBalances = balances.filter(
      (sb) => sb.product_variant_id === rawItem.product_variant_id
    )
    const matchingRule = rules.find(
      (rr) => rr.product_variant_id === rawItem.product_variant_id
    )

    const qty_on_hand = matchingBalances.reduce(
      (sum, b) => sum + Number(b.qty_on_hand || 0),
      0
    )
    const qty_reserved = matchingBalances.reduce(
      (sum, b) => sum + Number(b.qty_reserved || 0),
      0
    )
    const qty_available = matchingBalances.reduce(
      (sum, b) => sum + Number(b.qty_available || 0),
      0
    )

    const totalVal = matchingBalances.reduce(
      (sum, b) => sum + Number(b.qty_on_hand || 0) * Number(b.avg_cost || 0),
      0
    )
    const avg_cost =
      qty_on_hand > 0
        ? totalVal / qty_on_hand
        : Number(matchingBalances[0]?.avg_cost ?? 0)

    const primaryWh =
      matchingRule?.warehouses || matchingBalances[0]?.warehouses || null
    const primaryLoc = matchingBalances[0]?.warehouse_locations || null
    const primaryStore = matchingRule?.stores || null
    const prod = rawItem.product_variants?.products

    return {
      id: rawItem.id,
      inventory_id: rawItem.id,
      tenant_id: rawItem.tenant_id,
      product_variant_id: rawItem.product_variant_id,
      product_id: rawItem.product_variants?.product_id,
      sku: rawItem.sku,
      barcode: rawItem.barcode,
      is_stockable: rawItem.is_stockable,
      is_sellable: rawItem.is_sellable,
      is_purchasable: rawItem.is_purchasable,
      tracking_type: rawItem.tracking_type,
      unit_of_measure_id: rawItem.unit_of_measure_id,
      status: rawItem.status,
      is_active: rawItem.is_active,
      notes: rawItem.notes,
      created_at: rawItem.created_at,
      updated_at: rawItem.updated_at,
      products: prod
        ? {
            id: prod.id,
            name: prod.name,
            sku: prod.sku,
            has_variants: prod.has_variants,
            barcode: prod.barcode,
            category: prod.categories?.name,
            brand: prod.brands?.name,
          }
        : null,
      product_variants: rawItem.product_variants
        ? {
            id: rawItem.product_variants.id,
            product_id: rawItem.product_variants.product_id,
            name: rawItem.product_variants.name,
            sku: rawItem.product_variants.sku,
            barcode: rawItem.product_variants.barcode,
            weight: rawItem.product_variants.weight,
            dimensions: rawItem.product_variants.dimensions,
            is_active: rawItem.product_variants.is_active,
            price: Number(
              rawItem.product_variants.price_list_items?.[0]?.price ?? 0
            ),
            cost_price: Number(
              rawItem.product_variants.price_list_items?.[0]?.cost_price ?? 0
            ),
            qty_on_hand,
            qty_available,
            qty_reserved,
          }
        : null,
      uoms: rawItem.uoms
        ? {
            id: rawItem.uoms.id,
            code: rawItem.uoms.code,
            name: rawItem.uoms.name,
            is_base: rawItem.uoms.is_base,
            uom_category: rawItem.uoms.uom_category ?? null,
          }
        : null,
      warehouses: primaryWh,
      warehouse_locations: primaryLoc,
      stores: primaryStore,
      reorder_point: matchingRule?.reorder_point ?? null,
      min_quantity: matchingRule?.min_qty ?? null,
      max_quantity: matchingRule?.max_qty ?? null,
      safety_stock: matchingRule?.safety_stock ?? null,
      reorder_quantity: matchingRule?.reorder_qty ?? null,
      lead_time_days: matchingRule?.lead_time_days ?? null,
      qty_on_hand,
      qty_reserved,
      qty_available,
      avg_cost,
      unit_cost: avg_cost,
      condition: matchingBalances[0]?.condition ?? 'good',
      last_movement_at: matchingBalances[0]?.last_movement_at ?? null,
      quantity: qty_on_hand,
      reorder_level: matchingRule?.reorder_point ?? null,
      max_stock_level: matchingRule?.max_qty ?? null,
    }
  })

  return {
    items: mapped,
    totalCount,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
  }
}
