import { useMemo } from 'react'
import { useAuthQuery } from '@/hooks/use-auth-query'
import { authorizedRequest } from '@/lib/authorized-request'
import { supabase } from '@/lib/supabase'
import type { SOVariantStockBalance } from '../components/so-product-variant-picker'
import type { VariantStockSummary } from '../utils/variant-stock'

export interface UseWarehouseStockParams {
  storeId?: string | null
  warehouseId?: string | null
  warehouseIds?: string[]
  enabled?: boolean
}

export interface LiveVariantStockEntry extends VariantStockSummary {
  variantId: string
  avgCost: number
  warehouseId?: string | null
  storeId?: string | null
}

export interface UseWarehouseStockResult {
  stockBalances: SOVariantStockBalance[]
  variantStockMap: Map<string, LiveVariantStockEntry>
  getStock: (variantId: string) => LiveVariantStockEntry
  getStockForWarehouse: (variantId: string, whId: string) => VariantStockSummary
  getStoreStock: (variantId: string) => VariantStockSummary
  isLoading: boolean
  isFetching: boolean
  refetch: () => Promise<unknown>
}

const DEFAULT_ENTRY: LiveVariantStockEntry = {
  variantId: '',
  onHand: 0,
  reserved: 0,
  available: 0,
  avgCost: 0,
  isAvailable: false,
  isLowStock: false,
  isOutOfStock: true,
}

/**
 * Reactively queries the stock_balances table specifically for the selected store
 * and fulfillment warehouse.
 *
 * 1. Tries the server API endpoint `/api/inventory/stock-balances` for tenant isolation.
 * 2. Seamlessly falls back to Supabase client query for resilience.
 * 3. Aggregates live on_hand, reserved, and available quantities per variant.
 */
export function useWarehouseStockBalances({
  storeId,
  warehouseId,
  warehouseIds,
  enabled = true,
}: UseWarehouseStockParams): UseWarehouseStockResult {
  const queryEnabled = Boolean(
    enabled && (warehouseId || storeId || (warehouseIds && warehouseIds.length > 0))
  )

  const whIdsKey = useMemo(() => (warehouseIds ? [...warehouseIds].sort().join(',') : ''), [warehouseIds])

  const {
    data: stockBalances = [],
    isLoading,
    isFetching,
    refetch,
  } = useAuthQuery<SOVariantStockBalance[]>({
    queryKey: ['stock-balances', 'warehouse-live', storeId || '', warehouseId || '', whIdsKey],
    enabled: queryEnabled,
    queryFn: async (getToken) => {
      if (!warehouseId && !storeId && (!warehouseIds || warehouseIds.length === 0)) return []

      const params = new URLSearchParams()
      if (warehouseIds && warehouseIds.length > 0) {
        params.set('warehouseIds', warehouseIds.join(','))
      } else if (warehouseId) {
        params.set('warehouseId', warehouseId)
      }
      if (storeId) params.set('storeId', storeId)
      params.set('limit', '1000')

      // 1. Try server API
      try {
        const payload = (await authorizedRequest(
          getToken,
          `/api/inventory/stock-balances?${params.toString()}`
        )) as {
          items?: Array<{
            warehouse_id?: string | null
            store_id?: string | null
            product_variant_id: string
            qty_on_hand: number | string
            qty_reserved: number | string
            qty_available?: number | string | null
            avg_cost?: number | string | null
          }>
        }

        if (payload?.items && Array.isArray(payload.items)) {
          return payload.items.map((row) => ({
            warehouse_id: row.warehouse_id ?? null,
            store_id: row.store_id ?? null,
            product_variant_id: row.product_variant_id,
            qty_on_hand: Number(row.qty_on_hand || 0),
            qty_reserved: Number(row.qty_reserved || 0),
            qty_available:
              row.qty_available !== null && row.qty_available !== undefined
                ? Number(row.qty_available)
                : Math.max(0, Number(row.qty_on_hand || 0) - Number(row.qty_reserved || 0)),
            avg_cost: Number(row.avg_cost || 0),
          }))
        }
      } catch (err) {
        // Fallback to Supabase client
        console.warn('API stock-balances fallback to Supabase:', err)
      }

      // 2. Direct Supabase Query
      let sbQuery = supabase
        .from('stock_balances')
        .select(
          'warehouse_id, store_id, product_variant_id, qty_on_hand, qty_reserved, qty_available, avg_cost'
        )

      const targetWhIds = warehouseIds && warehouseIds.length > 0 ? warehouseIds : warehouseId ? [warehouseId] : []

      if (targetWhIds.length > 0 && storeId) {
        sbQuery = sbQuery.or(`warehouse_id.in.(${targetWhIds.join(',')}),store_id.eq.${storeId}`)
      } else if (targetWhIds.length > 0) {
        sbQuery = sbQuery.in('warehouse_id', targetWhIds)
      } else if (storeId) {
        sbQuery = sbQuery.eq('store_id', storeId)
      }

      const { data, error } = await sbQuery
      if (error) throw error

      return (data || []).map((row: Record<string, unknown>) => ({
        warehouse_id: (row.warehouse_id as string) ?? null,
        store_id: (row.store_id as string) ?? null,
        product_variant_id: String(row.product_variant_id),
        qty_on_hand: Number(row.qty_on_hand || 0),
        qty_reserved: Number(row.qty_reserved || 0),
        qty_available:
          row.qty_available !== null && row.qty_available !== undefined
            ? Number(row.qty_available)
            : Math.max(0, Number(row.qty_on_hand || 0) - Number(row.qty_reserved || 0)),
        avg_cost: Number(row.avg_cost || 0),
      }))
    },
  })

  // Map variant_id -> LiveVariantStockEntry for the selected warehouseId / store
  const variantStockMap = useMemo(() => {
    const map = new Map<string, LiveVariantStockEntry>()

    // Collect all unique variant IDs in the returned balances
    const allVariantIds = new Set<string>()
    for (const b of stockBalances) {
      if (b.product_variant_id) allVariantIds.add(b.product_variant_id)
    }

    for (const vId of allVariantIds) {
      let onHand = 0
      let reserved = 0
      let available = 0
      let avgCost = 0
      let hasMatch = false

      for (const b of stockBalances) {
        if (b.product_variant_id !== vId) continue

        // If warehouse is selected, strictly match that warehouse
        if (warehouseId) {
          if (b.warehouse_id === warehouseId) {
            hasMatch = true
            const bOnHand = Number(b.qty_on_hand || 0)
            const bReserved = Number(b.qty_reserved || 0)
            const computedAvail =
              b.qty_available !== null && b.qty_available !== undefined
                ? Number(b.qty_available)
                : Math.max(0, bOnHand - bReserved)
            onHand += bOnHand
            reserved += bReserved
            available += Math.max(0, computedAvail)
            if (Number(b.avg_cost || 0) > 0) avgCost = Number(b.avg_cost)
          }
        } else if (storeId) {
          // If only store selected, match store retail
          if (b.store_id === storeId && !b.warehouse_id) {
            hasMatch = true
            const bOnHand = Number(b.qty_on_hand || 0)
            const bReserved = Number(b.qty_reserved || 0)
            const computedAvail =
              b.qty_available !== null && b.qty_available !== undefined
                ? Number(b.qty_available)
                : Math.max(0, bOnHand - bReserved)
            onHand += bOnHand
            reserved += bReserved
            available += Math.max(0, computedAvail)
            if (Number(b.avg_cost || 0) > 0) avgCost = Number(b.avg_cost)
          }
        }
      }

      map.set(vId, {
        variantId: vId,
        onHand,
        reserved,
        available,
        avgCost,
        isAvailable: available > 0,
        isLowStock: available > 0 && available <= 5,
        isOutOfStock: available <= 0,
        warehouseId: warehouseId || null,
        storeId: storeId || null,
      })
    }

    return map
  }, [stockBalances, warehouseId, storeId])

  const getStock = useMemo(() => {
    return (variantId: string): LiveVariantStockEntry => {
      return (
        variantStockMap.get(variantId) || {
          ...DEFAULT_ENTRY,
          variantId,
        }
      )
    }
  }, [variantStockMap])

  // Get stock for a specific warehouse
  const getStockForWarehouse = useMemo(() => {
    return (variantId: string, whId: string): VariantStockSummary => {
      let onHand = 0
      let reserved = 0
      let available = 0
      for (const b of stockBalances) {
        if (b.product_variant_id === variantId && b.warehouse_id === whId) {
          const bOnHand = Number(b.qty_on_hand || 0)
          const bReserved = Number(b.qty_reserved || 0)
          const computedAvail =
            b.qty_available !== null && b.qty_available !== undefined
              ? Number(b.qty_available)
              : Math.max(0, bOnHand - bReserved)
          onHand += bOnHand
          reserved += bReserved
          available += Math.max(0, computedAvail)
        }
      }
      return {
        onHand,
        reserved,
        available,
        isAvailable: available > 0,
        isLowStock: available > 0 && available <= 5,
        isOutOfStock: available <= 0,
      }
    }
  }, [stockBalances])

  // Get store retail stock (store_id === storeId, warehouse_id is null)
  const getStoreStock = useMemo(() => {
    return (variantId: string): VariantStockSummary => {
      let onHand = 0
      let reserved = 0
      let available = 0
      for (const b of stockBalances) {
        if (b.product_variant_id === variantId && b.store_id === storeId && !b.warehouse_id) {
          const bOnHand = Number(b.qty_on_hand || 0)
          const bReserved = Number(b.qty_reserved || 0)
          const computedAvail =
            b.qty_available !== null && b.qty_available !== undefined
              ? Number(b.qty_available)
              : Math.max(0, bOnHand - bReserved)
          onHand += bOnHand
          reserved += bReserved
          available += Math.max(0, computedAvail)
        }
      }
      return {
        onHand,
        reserved,
        available,
        isAvailable: available > 0,
        isLowStock: available > 0 && available <= 5,
        isOutOfStock: available <= 0,
      }
    }
  }, [stockBalances, storeId])

  return {
    stockBalances,
    variantStockMap,
    getStock,
    getStockForWarehouse,
    getStoreStock,
    isLoading,
    isFetching,
    refetch,
  }
}
