import { authorizedRequest, type TokenGetter } from '@/lib/authorized-request'
import { supabase } from '@/lib/supabase'
import { resolveClientTenantId } from '@/lib/client-tenant'
import type {
  ValuationFilters,
  ValuationResponse,
  ValuationFilterLookups,
  ValuationItemRow,
  TenantCurrencyInfo,
} from './valuation-schema'

/**
 * Resolves tenant default currency for client queries
 */
export async function resolveClientTenantCurrency(
  tenantId?: string | null
): Promise<TenantCurrencyInfo> {
  const fallbackCurrency: TenantCurrencyInfo = {
    currencyId: null,
    currencyCode: 'USD',
    currencySymbol: '$',
    currencyName: 'US Dollar',
  }

  if (!tenantId) return fallbackCurrency

  try {
    const { data: tenantRecord } = await supabase
      .from('tenants')
      .select('currency_id, currency_code, currencies(id, code, symbol, name)')
      .eq('id', tenantId)
      .maybeSingle()

    const cur = Array.isArray(tenantRecord?.currencies)
      ? tenantRecord.currencies[0]
      : tenantRecord?.currencies

    if (cur?.symbol) {
      return {
        currencyId: cur.id || tenantRecord?.currency_id || null,
        currencyCode: cur.code || tenantRecord?.currency_code || 'USD',
        currencySymbol: cur.symbol,
        currencyName: cur.name || null,
      }
    }

    if (tenantRecord?.currency_id) {
      const { data: curRecord } = await supabase
        .from('currencies')
        .select('id, code, symbol, name')
        .eq('id', tenantRecord.currency_id)
        .maybeSingle()

      if (curRecord?.symbol) {
        return {
          currencyId: curRecord.id,
          currencyCode: curRecord.code,
          currencySymbol: curRecord.symbol,
          currencyName: curRecord.name || null,
        }
      }
    }

    if (tenantRecord?.currency_code) {
      return {
        currencyId: tenantRecord.currency_id || null,
        currencyCode: tenantRecord.currency_code,
        currencySymbol: tenantRecord.currency_code,
        currencyName: null,
      }
    }
  } catch (err) {
    console.warn('Failed to resolve client tenant currency:', err)
  }

  return fallbackCurrency
}

const BASE = '/api/inventory/valuation'

/**
 * Fetch inventory asset valuation with server-side filters, dynamic costing method,
 * pagination, and aggregate metrics. Falls back seamlessly to direct client query.
 */
export async function fetchInventoryValuation(
  getToken: TokenGetter,
  filters: Partial<ValuationFilters> = {}
): Promise<ValuationResponse> {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '' && value !== 'all') {
      params.set(key, String(value))
    }
  }

  // Explicitly retain method, page, and limit
  if (filters.valuationMethod) {
    params.set('valuationMethod', filters.valuationMethod)
  }
  if (filters.page) {
    params.set('page', String(filters.page))
  }
  if (filters.limit) {
    params.set('limit', String(filters.limit))
  }
  if (filters.sortBy) {
    params.set('sortBy', filters.sortBy)
  }
  if (filters.sortOrder) {
    params.set('sortOrder', filters.sortOrder)
  }

  const query = params.toString()
  const endpoint = query ? `${BASE}?${query}` : BASE

  try {
    const payload = await authorizedRequest(getToken, endpoint)
    if (payload && (payload as ValuationResponse).items) {
      return payload as ValuationResponse
    }
  } catch (err) {
    console.warn('API route /api/inventory/valuation unavailable, falling back to Supabase client query:', err)
  }

  // Fallback: Direct client-side calculation with Supabase
  const tenantId = await resolveClientTenantId()
  const tenantCurrency = await resolveClientTenantCurrency(tenantId)
  let balancesQuery = supabase
    .from('stock_balances')
    .select(
      `
      id,
      tenant_id,
      warehouse_id,
      store_id,
      location_id,
      product_variant_id,
      condition,
      qty_on_hand,
      qty_reserved,
      qty_available,
      avg_cost,
      last_movement_at,
      warehouses (id, name, code),
      warehouse_locations (id, name, code),
      stores (store_id, name)
    `
    )
    .order('updated_at', { ascending: false })

  if (tenantId) {
    balancesQuery = balancesQuery.eq('tenant_id', tenantId)
  }
  if (filters.warehouseId && filters.warehouseId !== 'all') {
    balancesQuery = balancesQuery.eq('warehouse_id', filters.warehouseId)
  }
  if (filters.storeId && filters.storeId !== 'all') {
    balancesQuery = balancesQuery.eq('store_id', filters.storeId)
  }
  if (filters.condition && filters.condition !== 'all') {
    balancesQuery = balancesQuery.eq('condition', filters.condition)
  }

  const { data: rawBalances, error: balErr } = await balancesQuery
  if (balErr) throw balErr

  // Fetch product variants with product info & pricing
  let variantsQuery = supabase
    .from('product_variants')
    .select(
      `
      id,
      sku,
      barcode,
      name,
      products (
        id,
        name,
        category_id,
        supplier_id,
        reorder_level,
        categories (id, name),
        suppliers (id, name, code)
      ),
      price_list_items (price, cost_price)
    `
    )

  if (tenantId) {
    variantsQuery = variantsQuery.eq('tenant_id', tenantId)
  }

  const { data: rawVariants, error: varErr } = await variantsQuery
  if (varErr) throw varErr

  const variantMap = new Map((rawVariants || []).map((v) => [v.id, v]))
  const method = filters.valuationMethod || 'avco'

  let grandAvcoTotal = 0
  let grandStandardTotal = 0
  let grandFifoTotal = 0
  let grandRetailTotal = 0
  let grandUnits = 0
  let lowStockCount = 0
  let outOfStockCount = 0

  const allItems: ValuationItemRow[] = (rawBalances || []).map((b: any) => {
    const v: any = variantMap.get(b.product_variant_id)
    const pli = v?.price_list_items?.[0]

    const onHand = Number(b.qty_on_hand || 0)
    const reserved = Number(b.qty_reserved || 0)
    const computedAvailable =
      b.qty_available !== null && b.qty_available !== undefined
        ? Number(b.qty_available)
        : Math.max(0, onHand - reserved)

    const reorderLevel = Number(v?.products?.reorder_level ?? 10)
    const avcoCost = Number(b.avg_cost ?? pli?.cost_price ?? 0)
    const standardCost = Number(pli?.cost_price ?? b.avg_cost ?? 0)
    const sellingPrice = Number(pli?.price ?? 0)

    const safeAvco = avcoCost > 0 ? avcoCost : (sellingPrice > 0 ? sellingPrice * 0.7 : 0)
    const safeStandard = standardCost > 0 ? standardCost : safeAvco
    const safeFifo = safeAvco > 0 ? safeAvco : safeStandard

    let unitCost = safeAvco
    if (method === 'standard') unitCost = safeStandard
    else if (method === 'fifo') unitCost = safeFifo
    else if (method === 'retail') unitCost = sellingPrice

    const totalValue = onHand * unitCost
    const potentialRevenue = onHand * sellingPrice
    const potentialMargin =
      potentialRevenue > 0
        ? ((potentialRevenue - (onHand * safeAvco)) / potentialRevenue) * 100
        : 0

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

    const whData = Array.isArray(b.warehouses) ? b.warehouses[0] : b.warehouses
    const storeData = Array.isArray(b.stores) ? b.stores[0] : b.stores
    const locData = Array.isArray(b.warehouse_locations) ? b.warehouse_locations[0] : b.warehouse_locations

    return {
      id: b.id,
      balanceId: b.id,
      warehouseId: b.warehouse_id,
      warehouseName: whData?.name || null,
      warehouseCode: whData?.code || null,
      storeId: b.store_id,
      storeName: storeData?.name || null,
      locationId: b.location_id,
      locationName: locData?.name || null,
      locationCode: locData?.code || null,
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
      sharePercent: 0,
      lastMovementAt: b.last_movement_at || null,
      stockStatus,
      currencySymbol: tenantCurrency.currencySymbol,
    }
  })

  let activeTotal = grandAvcoTotal
  if (method === 'standard') activeTotal = grandStandardTotal
  else if (method === 'fifo') activeTotal = grandFifoTotal
  else if (method === 'retail') activeTotal = grandRetailTotal

  for (const row of allItems) {
    row.sharePercent = activeTotal > 0 ? (row.totalValue / activeTotal) * 100 : 0
  }

  // Client filtering for fallback
  let filtered = allItems
  if (filters.search && filters.search.trim()) {
    const q = filters.search.trim().toLowerCase()
    filtered = filtered.filter(
      (r) =>
        r.sku.toLowerCase().includes(q) ||
        r.productName.toLowerCase().includes(q) ||
        (r.barcode && r.barcode.toLowerCase().includes(q))
    )
  }
  if (filters.categoryId && filters.categoryId !== 'all') {
    filtered = filtered.filter((r) => r.categoryId === filters.categoryId)
  }
  if (filters.supplierId && filters.supplierId !== 'all') {
    filtered = filtered.filter((r) => r.supplierId === filters.supplierId)
  }
  if (filters.stockStatus && filters.stockStatus !== 'all') {
    if (filters.stockStatus === 'out_of_stock') {
      filtered = filtered.filter((r) => r.stockStatus === 'out_of_stock')
    } else if (filters.stockStatus === 'low_stock') {
      filtered = filtered.filter((r) => r.stockStatus === 'low_stock')
    } else if (filters.stockStatus === 'in_stock') {
      filtered = filtered.filter((r) => r.stockStatus === 'in_stock')
    } else if (filters.stockStatus === 'high_value') {
      filtered = filtered.filter((r) => r.totalValue >= 500)
    }
  }

  const page = Math.max(1, filters.page || 1)
  const limit = Math.min(200, Math.max(1, filters.limit || 25))
  const offset = (page - 1) * limit
  const paginated = filtered.slice(offset, offset + limit)

  return {
    items: paginated,
    total: filtered.length,
    page,
    limit,
    totalPages: Math.ceil(filtered.length / limit) || 1,
    metrics: {
      totalValuation: activeTotal,
      totalUnits: grandUnits,
      totalPotentialRevenue: grandRetailTotal,
      averageMargin: grandRetailTotal > 0 ? ((grandRetailTotal - grandAvcoTotal) / grandRetailTotal) * 100 : 0,
      lowStockCount,
      outOfStockCount,
      totalLines: allItems.length,
      methodTotals: {
        avco: grandAvcoTotal,
        standard: grandStandardTotal,
        fifo: grandFifoTotal,
        retail: grandRetailTotal,
      },
    },
    currency: tenantCurrency,
  }
}

/**
 * Fetch lookup dropdown items from real tables (warehouses, stores, categories, suppliers)
 */
export async function fetchValuationLookups(
  getToken: TokenGetter
): Promise<ValuationFilterLookups> {
  try {
    const payload = await authorizedRequest(getToken, `${BASE}?lookups=true`)
    if (payload && (payload as any).warehouses) {
      return payload as ValuationFilterLookups
    }
  } catch (err) {
    console.warn('API route lookup failed, falling back to Supabase client:', err)
  }

  const tenantId = await resolveClientTenantId()

  let whQuery = supabase.from('warehouses').select('id, name, code').eq('is_active', true)
  let storeQuery = supabase.from('stores').select('store_id, name').eq('status', true)
  let catQuery = supabase.from('categories').select('id, name')
  let supQuery = supabase.from('suppliers').select('id, name, code').eq('is_active', true)

  if (tenantId) {
    whQuery = whQuery.eq('tenant_id', tenantId)
    storeQuery = storeQuery.eq('tenant_id', tenantId)
    catQuery = catQuery.eq('tenant_id', tenantId)
    supQuery = supQuery.eq('tenant_id', tenantId)
  }

  const [whRes, storeRes, catRes, supRes] = await Promise.all([
    whQuery,
    storeQuery,
    catQuery,
    supQuery,
  ])

  return {
    warehouses: (whRes.data || []).map((w: any) => ({ id: w.id, name: w.name, code: w.code })),
    stores: (storeRes.data || []).map((s: any) => ({ id: s.store_id, name: s.name || 'Store' })),
    categories: (catRes.data || []).map((c: any) => ({ id: String(c.id), name: c.name })),
    suppliers: (supRes.data || []).map((s: any) => ({ id: s.id, name: s.name, code: s.code })),
    currency: await resolveClientTenantCurrency(tenantId),
  }
}
