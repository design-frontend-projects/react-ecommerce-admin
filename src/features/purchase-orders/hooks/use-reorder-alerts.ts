import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface ReorderAlert {
  id?: string
  inventory_id?: number | string
  product_id?: string | null
  product_variant_id?: string | null
  quantity: number
  reorder_level: number
  max_stock_level?: number | null
  products: {
    name: string
    id: string
    supplier_id?: string | null
    suppliers?: { name: string; id: string } | null
  } | null
}

// ─── Get items below reorder level ────────────────────────
export const useReorderAlerts = () => {
  return useQuery({
    queryKey: ['reorder-alerts'],
    queryFn: async () => {
      const { data: invData, error: invError } = await supabase
        .from('inventory')
        .select(
          'inventory_id, product_id, product_variant_id, reorder_level, min_quantity, reorder_point, products(id, name, supplier_id, suppliers(id, name))'
        )
        .or('reorder_level.gt.0,reorder_point.gt.0,min_quantity.gt.0')

      if (invError) {
        console.warn('Failed to load inventory reorder items:', invError.message)
        return []
      }

      if (!invData || invData.length === 0) return []

      // Fetch stock balances to know actual available quantity
      const { data: sbData } = await supabase
        .from('stock_balances')
        .select('product_variant_id, qty_available, qty_on_hand, qty_reserved')

      const stockMap = new Map<string, number>()
      for (const sb of sbData || []) {
        if (!sb.product_variant_id) continue
        const qty = Number(
          sb.qty_available ??
            (Number(sb.qty_on_hand || 0) - Number(sb.qty_reserved || 0))
        )
        stockMap.set(
          sb.product_variant_id,
          (stockMap.get(sb.product_variant_id) || 0) + qty
        )
      }

      const alerts: ReorderAlert[] = []
      for (const item of invData) {
        const threshold = Number(
          item.reorder_level ?? item.reorder_point ?? item.min_quantity ?? 0
        )
        if (threshold <= 0) continue

        const currentQty = item.product_variant_id
          ? stockMap.get(item.product_variant_id) ?? 0
          : 0

        if (currentQty <= threshold) {
          alerts.push({
            inventory_id: item.inventory_id,
            product_id: item.product_id,
            product_variant_id: item.product_variant_id,
            quantity: currentQty,
            reorder_level: threshold,
            products: (item.products as unknown as ReorderAlert['products']) || null,
          })
        }
      }

      return alerts
    },
  })
}
