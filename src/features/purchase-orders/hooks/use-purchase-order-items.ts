import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface PurchaseOrderItemRecord {
  po_item_id: number
  po_id: number
  product_id: number
  quantity: number
  unit_cost: number
  subtotal: number
  received_quantity: number
  products?: { name: string } | null
}

export interface PurchaseOrderItemInput {
  product_id: number
  quantity: number
  unit_cost: number
  subtotal: number
}

// ─── Update received qty for a single item ────────────────
export const useUpdateReceivedQuantity = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      po_item_id,
      received_quantity,
    }: {
      po_item_id: number
      received_quantity: number
      po_id: number
    }) => {
      const { data, error } = await supabase
        .from('purchase_order_items')
        .update({ received_quantity })
        .eq('po_item_id', po_item_id)
        .select()
        .maybeSingle()

      if (error) throw error
      return data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      queryClient.invalidateQueries({
        queryKey: ['purchase-orders', variables.po_id],
      })
    },
  })
}

// ─── Batch receive all items for a PO using transactional RPC ─────
export const useBatchReceiveItems = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      po_id,
      store_id,
      items,
    }: {
      po_id: number
      store_id: string
      items: Array<{
        po_item_id: number
        variant_id: string
        qty_to_receive: number
        unit_cost: number
      }>
    }) => {
      const { data, error } = await supabase.rpc('receive_purchase_order_items', {
        p_po_id: po_id,
        p_store_id: store_id,
        p_received_items: items,
      })

      if (error) throw error
      return data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      queryClient.invalidateQueries({
        queryKey: ['purchase-orders', variables.po_id],
      })
      queryClient.invalidateQueries({ queryKey: ['stock-balances'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] })
      queryClient.invalidateQueries({ queryKey: ['product-variants'] })
    },
  })
}
