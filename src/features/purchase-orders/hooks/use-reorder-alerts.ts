import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface ReorderAlert {
  inventory_id: number
  product_id: number
  quantity: number
  reorder_level: number
  max_stock_level: number | null
  products: {
    name: string
    product_id: number
    supplier_id: number | null
    suppliers?: { name: string; supplier_id: number } | null
  } | null
}

// ─── Get items below reorder level ────────────────────────
export const useReorderAlerts = () => {
  return useQuery({
    queryKey: ['reorder-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory')
        .select(
          '*, products(name, product_id, supplier_id, suppliers(name, supplier_id))'
        )
        .not('reorder_level', 'is', null)
        .order('quantity', { ascending: true })

      if (error) throw error

      // Filter items where quantity <= reorder_level
      const alerts = (data as ReorderAlert[]).filter(
        (item) =>
          item.reorder_level !== null && item.quantity <= item.reorder_level
      )

      return alerts
    },
  })
}
