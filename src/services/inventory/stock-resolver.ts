import type { SupabaseClient } from '@supabase/supabase-js'

export interface StockResolutionContext {
  tenantId?: string | null
  variantId: string
  storeId?: string | null
  warehouseId?: string | null
}

export interface ResolvedStock {
  qtyOnHand: number
  qtyReserved: number
  qtyAvailable: number
  avgCost: number
  isAvailable: boolean
  sourceLocation: string | null
}

export interface StockBalanceRecord {
  id: string
  tenant_id?: string
  warehouse_id?: string | null
  location_id?: string | null
  store_id?: string | null
  product_variant_id: string
  qty_on_hand: number | string
  qty_reserved: number | string
  qty_available?: number | string | null
  avg_cost?: number | string | null
}

/**
 * Synchronously aggregates stock balances for a variant, optionally filtering by store or warehouse.
 */
export function aggregateStockBalances(
  balances: StockBalanceRecord[],
  context: StockResolutionContext
): ResolvedStock {
  if (!balances || balances.length === 0) {
    return {
      qtyOnHand: 0,
      qtyReserved: 0,
      qtyAvailable: 0,
      avgCost: 0,
      isAvailable: false,
      sourceLocation: null,
    }
  }

  // Filter by store or warehouse if specified
  const filtered = balances.filter((b) => {
    if (b.product_variant_id !== context.variantId) return false
    if (context.storeId && b.store_id && b.store_id !== context.storeId) return false
    if (context.warehouseId && b.warehouse_id && b.warehouse_id !== context.warehouseId) return false
    return true
  })

  const targetBalances = filtered.length > 0 ? filtered : balances

  let totalOnHand = 0
  let totalReserved = 0
  let totalCostSum = 0

  for (const b of targetBalances) {
    const onHand = Number(b.qty_on_hand || 0)
    const reserved = Number(b.qty_reserved || 0)
    const cost = Number(b.avg_cost || 0)
    totalOnHand += onHand
    totalReserved += reserved
    totalCostSum += onHand * cost
  }

  const available = Math.max(0, totalOnHand - totalReserved)
  const avgCost = totalOnHand > 0 ? totalCostSum / totalOnHand : 0

  return {
    qtyOnHand: totalOnHand,
    qtyReserved: totalReserved,
    qtyAvailable: available,
    avgCost,
    isAvailable: available > 0,
    sourceLocation: context.storeId || context.warehouseId || null,
  }
}

/**
 * Asynchronously queries Supabase stock_balances for live stock availability.
 */
export async function resolveVariantStock(
  supabase: SupabaseClient,
  context: StockResolutionContext
): Promise<ResolvedStock> {
  let query = supabase
    .from('stock_balances')
    .select('id, warehouse_id, store_id, product_variant_id, qty_on_hand, qty_reserved, qty_available, avg_cost')
    .eq('product_variant_id', context.variantId)

  if (context.tenantId) {
    query = query.eq('tenant_id', context.tenantId)
  }
  if (context.storeId) {
    query = query.eq('store_id', context.storeId)
  }
  if (context.warehouseId) {
    query = query.eq('warehouse_id', context.warehouseId)
  }

  const { data, error } = await query

  if (error || !data || data.length === 0) {
    return {
      qtyOnHand: 0,
      qtyReserved: 0,
      qtyAvailable: 0,
      avgCost: 0,
      isAvailable: false,
      sourceLocation: null,
    }
  }

  return aggregateStockBalances(data as unknown as StockBalanceRecord[], context)
}
