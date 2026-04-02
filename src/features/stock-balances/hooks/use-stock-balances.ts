import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { StockBalanceRow } from '../data/schema'
import type { AdjustmentFormData } from '../data/adjustment-schema'

// ── Query: paginated stock balances with joins ──
export const stockBalancesQueryKey = ['stock-balances'] as const

export function useStockBalances() {
  return useQuery<StockBalanceRow[]>({
    queryKey: stockBalancesQueryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_balances')
        .select(
          `
          *,
          product_variants (
            id,
            sku,
            price,
            cost_price,
            products (
              product_id,
              name
            )
          ),
          stores (
            store_id,
            name
          )
        `
        )
        .order('updated_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as StockBalanceRow[]
    },
  })
}

// ── Mutation: manual stock adjustment ──
export function useAdjustStock() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: AdjustmentFormData) => {
      // Call the database function we created
      const { data, error } = await supabase.rpc('adjust_stock_balance', {
        p_store_id: values.store_id,
        p_product_variant_id: values.product_variant_id,
        p_adjustment_type: values.adjustment_type,
        p_quantity: values.quantity,
        p_reason: values.reason,
      })

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockBalancesQueryKey })
      toast.success('Stock balance adjusted successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to adjust stock balance')
    },
  })
}

// ── Query: all units/stores ──
export function useStores() {
  return useQuery({
    queryKey: ['stores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('store_id, name')
        .order('name')

      if (error) throw error
      return data ?? []
    },
  })
}

// ── Query: product variants filtered by product ──
export function useProductVariants(productId?: number) {
  return useQuery({
    queryKey: ['product-variants', productId],
    queryFn: async () => {
      if (!productId) return []
      const { data, error } = await supabase
        .from('product_variants')
        .select('id, sku, price, cost_price')
        .eq('product_id', productId)
        .order('sku')

      if (error) throw error
      return data ?? []
    },
    enabled: !!productId,
  })
}

