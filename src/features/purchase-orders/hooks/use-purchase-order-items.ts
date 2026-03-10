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
        .single()

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

// ─── Batch receive all items for a PO ─────────────────────
export const useBatchReceiveItems = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      items,
    }: {
      po_id: number
      items: Array<{ po_item_id: number; received_quantity: number }>
    }) => {
      // Update each item's received_quantity
      const updates = items.map((item) =>
        supabase
          .from('purchase_order_items')
          .update({ received_quantity: item.received_quantity })
          .eq('po_item_id', item.po_item_id)
      )

      const results = await Promise.all(updates)
      const errors = results.filter((r) => r.error)
      if (errors.length > 0)
        throw new Error(errors[0].error?.message || 'Failed to update items')

      return results
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      queryClient.invalidateQueries({
        queryKey: ['purchase-orders', variables.po_id],
      })
    },
  })
}
