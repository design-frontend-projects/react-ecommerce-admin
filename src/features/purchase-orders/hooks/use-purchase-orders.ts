import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────
export interface PurchaseOrder {
  po_id: number
  supplier_id: number | null
  order_date: string | null
  status: 'pending' | 'partial' | 'received' | 'cancelled'
  total_amount: number | null
  expected_delivery_date: string | null
  notes: string | null
  created_at: string | null
  suppliers?: { name: string } | null
  purchase_order_items: Array<{
    po_item_id: number
    po_id: number
    product_id: number
    product_variant_id: string | null
    quantity_ordered: number
    unit_cost: number
    subtotal: number
    received_quantity: number | null
    products?: { 
      name: string
      product_variants?: Array<{
        id: string
        sku: string
        price: number
        cost_price: number | null
      }>
    } | null
  }>
}

export interface PurchaseOrderWithItems extends PurchaseOrder {
  purchase_order_items: PurchaseOrderItem[]
}

export interface PurchaseOrderItem {
  po_item_id: number
  po_id: number
  product_id: number
  product_variant_id: string | null
  quantity_ordered: number
  unit_cost: number
  subtotal: number
  received_quantity: number
  products?: { 
    name: string
    product_variants?: Array<{
      id: string
      sku: string
      price: number
      cost_price: number | null
    }>
  } | null
}

export interface PurchaseOrderInput {
  supplier_id: number
  order_date: string
  expected_delivery_date?: string | null
  notes?: string
}

export interface PurchaseOrderItemInput {
  product_id: number
  unit_cost: number
  subtotal: number
}

// ─── List all POs ─────────────────────────────────────────
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

// ─── Single PO with items ─────────────────────────────────
export const usePurchaseOrder = (id: number) => {
  return useQuery({
    queryKey: ['purchase-orders', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`*, suppliers(name), 
                purchase_order_items(
                  *,
                  products(
                    name,
                    product_variants(id, sku, price, cost_price)
                  )
                )
              `)
        .eq('po_id', id)
        .maybeSingle()

      if (error) throw error
      return data as PurchaseOrderWithItems
    },
    enabled: !!id,
  })
}

// ─── Create PO with items ─────────────────────────────────
export const useCreatePurchaseOrder = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      order,
      items,
    }: {
      order: PurchaseOrderInput
      items: PurchaseOrderItemInput[]
    }) => {
      // Calculate total
      const total_amount = items.reduce((sum, item) => sum + item.subtotal, 0)

      // Insert PO header
      const { data: po, error: poError } = await supabase
        .from('purchase_orders')
        .insert({ ...order, total_amount })
        .select()
        .maybeSingle()

      if (poError) throw poError

      // Insert line items
      if (items.length > 0) {
        const itemsWithPoId = items.map((item) => ({
          ...item,
          po_id: po.po_id,
        }))

        const { error: itemsError } = await supabase
          .from('purchase_order_items')
          .insert(itemsWithPoId)

        if (itemsError) throw itemsError
      }

      return po
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
    },
  })
}

// ─── Update PO header + upsert items ─────────────────────
export const useUpdatePurchaseOrder = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      order,
      items,
    }: {
      id: number
      order: PurchaseOrderInput
      items: PurchaseOrderItemInput[]
    }) => {
      const total_amount = items.reduce((sum, item) => sum + item.subtotal, 0)

      // Update PO header
      const { data: po, error: poError } = await supabase
        .from('purchase_orders')
        .update({ ...order, total_amount })
        .eq('po_id', id)
        .select()
        .maybeSingle()

      if (poError) throw poError

      // Delete existing items and re-insert
      const { error: deleteError } = await supabase
        .from('purchase_order_items')
        .delete()
        .eq('po_id', id)

      if (deleteError) throw deleteError

      if (items.length > 0) {
        const itemsWithPoId = items.map((item) => ({
          ...item,
          po_id: id,
        }))

        const { error: itemsError } = await supabase
          .from('purchase_order_items')
          .insert(itemsWithPoId)

        if (itemsError) throw itemsError
      }

      return po
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      queryClient.invalidateQueries({
        queryKey: ['purchase-orders', variables.id],
      })
    },
  })
}

// ─── Update PO status only ────────────────────────────────
export const useUpdatePurchaseOrderStatus = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: number
      status: 'pending' | 'received' | 'partial' | 'cancelled'
    }) => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .update({ status })
        .eq('po_id', id)
        .select()
        .maybeSingle()

      if (error) throw error
      return data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      queryClient.invalidateQueries({
        queryKey: ['purchase-orders', variables.id],
      })
    },
  })
}

// ─── Delete PO ────────────────────────────────────────────
export const useDeletePurchaseOrder = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      // Items cascade-delete via FK
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
