import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface StoreOption {
  store_id: string
  name: string | null
}

export interface VariantOption {
  id: string
  sku: string
  price: number | string
  cost_price: number | string | null
  products?: { product_id: number; name: string } | null
}

/** All stores for select inputs. */
export function useStoreOptions() {
  return useQuery<StoreOption[]>({
    queryKey: ['stores', 'options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('store_id, name')
        .order('name')
      if (error) throw error
      return (data ?? []) as StoreOption[]
    },
  })
}

/** On-hand quantity per variant for a store (for stocktake discrepancy display). */
export function useStoreOnHand(storeId?: string) {
  return useQuery<Record<string, number>>({
    queryKey: ['stock-balances', 'on-hand', storeId ?? ''],
    enabled: Boolean(storeId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_balances')
        .select('product_variant_id, qty_on_hand')
        .eq('store_id', storeId as string)
      if (error) throw error
      const map: Record<string, number> = {}
      for (const row of data ?? []) {
        map[(row as { product_variant_id: string }).product_variant_id] =
          Number((row as { qty_on_hand: number | string }).qty_on_hand)
      }
      return map
    },
  })
}

/** Product variants searchable by SKU or product name (for line-item pickers). */
export function useVariantOptions(search?: string) {
  return useQuery<VariantOption[]>({
    queryKey: ['product-variants', 'options', search ?? ''],
    queryFn: async () => {
      let query = supabase
        .from('product_variants')
        .select('id, sku, price, cost_price, products(product_id, name)')
        .order('sku')
        .limit(50)
      if (search) {
        query = query.ilike('sku', `%${search}%`)
      }
      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as unknown as VariantOption[]
    },
  })
}
