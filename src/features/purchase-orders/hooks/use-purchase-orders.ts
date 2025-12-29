import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface PurchaseOrder {
  po_id: number
  supplier_id: number
  order_date: string
  expected_delivery_date: string | null
  total_amount: number
  status: string
  notes: string | null
  suppliers?: {
    name: string
  }
}

export interface PurchaseOrderInput {
  supplier_id: number
  order_date: string
  expected_delivery_date?: string
  total_amount: number
  status: string
  notes?: string
}

export const usePurchaseOrders = () => {
  return useQuery({
    queryKey: ['purchase-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('*, suppliers(name)')
        .order('order_date', { ascending: false })

      if (error) throw error
      return data as PurchaseOrder[]
    },
  })
}

export const useCreatePurchaseOrder = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (newOrder: PurchaseOrderInput) => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .insert(newOrder)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
    },
  })
}

export const useUpdatePurchaseOrder = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: PurchaseOrderInput & { id: number }) => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .update(updates)
        .eq('po_id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
    },
  })
}

export const useDeletePurchaseOrder = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('purchase_orders')
        .delete()
        .eq('po_id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
    },
  })
}
