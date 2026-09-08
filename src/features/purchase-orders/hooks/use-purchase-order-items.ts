import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface PurchaseOrderItemRecord {
  id?: string
  po_item_id?: number | string
  po_id: number | string
  product_id: number | string
  quantity: number
  unit_cost: number
  subtotal: number
  received_quantity: number
  products?: { name: string } | null
}

export interface PurchaseOrderItemInput {
  product_id: number | string
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
      po_item_id: number | string
      received_quantity: number
      po_id: number | string
    }) => {
      const { data, error } = await supabase
        .from('purchase_order_items')
        .update({ received_quantity })
        .eq('id', String(po_item_id))
        .select()
        .maybeSingle()

      if (error) throw error
      return data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      queryClient.invalidateQueries({
        queryKey: ['purchase-orders', String(variables.po_id)],
      })
    },
  })
}

// ─── Batch receive all items for a PO using transactional RPC or direct update fallback ─────
export const useBatchReceiveItems = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      po_id,
      store_id,
      items,
    }: {
      po_id: number | string
      store_id: string
      items: Array<{
        po_item_id?: number | string
        item_id?: string
        variant_id: string
        qty_to_receive: number
        unit_cost: number
      }>
    }) => {
      // 1. Attempt transactional RPC if present
      try {
        const { data, error } = await supabase.rpc(
          'receive_purchase_order_items',
          {
            p_po_id: po_id,
            p_store_id: store_id,
            p_received_items: items,
          }
        )
        if (!error && data) {
          return data
        }
      } catch {
        // Fall back to direct table update if RPC does not exist
      }

      // 2. Direct fallback: Update purchase_order_items directly
      for (const item of items) {
        const itemId = String(item.item_id || item.po_item_id)
        if (!itemId) continue

        const { data: currentItem } = await supabase
          .from('purchase_order_items')
          .select('received_quantity')
          .eq('id', itemId)
          .maybeSingle()

        const currentQty = Number(currentItem?.received_quantity ?? 0)
        const nextQty = currentQty + Number(item.qty_to_receive)

        const { error: updateErr } = await supabase
          .from('purchase_order_items')
          .update({ received_quantity: nextQty })
          .eq('id', itemId)

        if (updateErr) throw updateErr
      }

      return { success: true }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      queryClient.invalidateQueries({
        queryKey: ['purchase-orders', String(variables.po_id)],
      })
      queryClient.invalidateQueries({ queryKey: ['stock-balances'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] })
      queryClient.invalidateQueries({ queryKey: ['product-variants'] })
    },
  })
}
