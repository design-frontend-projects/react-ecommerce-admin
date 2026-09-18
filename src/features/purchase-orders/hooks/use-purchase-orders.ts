import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authorizedRequest } from '@/lib/authorized-request'
import { supabase } from '@/lib/supabase'
import { useAuthEnabled } from '@/hooks/use-auth-query'
import { useAuthMutation } from '@/hooks/use-auth-mutation'
import { useAuth } from '@/hooks/use-auth'
import {
  getAuthTenantAndUser,
  resolveClientTenantId,
  isValidUuid,
} from '@/lib/client-tenant'

// ─── Lifecycle & Status Types (Prisma po_lifecycle_status_enum) ──
export type PurchaseOrderLifecycleStatus =
  | 'draft'
  | 'approved'
  | 'sent'
  | 'partially_received'
  | 'received'
  | 'closed'
  | 'cancelled'

export type PurchaseOrderStatus =
  | 'pending'
  | 'partial'
  | 'received'
  | 'cancelled'
  | PurchaseOrderLifecycleStatus

// ─── Prisma-Consistent Models ──────────────────────────────
export interface PurchaseOrderItem {
  id?: string
  po_item_id?: number | string
  po_id: number | string
  line_no?: number
  tenant_id?: string
  product_id: number | string
  product_variant_id: string | null
  quantity_ordered: number
  unit_cost: number
  tax_amount?: number | null
  discount_amount?: number | null
  subtotal: number
  received_quantity: number | null
  cancelled_qty?: number | null
  uom_id?: string | null
  uoms?: {
    id: string
    name: string
    code: string
    uom_category?: string
  } | null
  products?: {
    name: string
    sku?: string
    base_uom_id?: string | null
    base_uom?: { id: string; name: string; code: string } | null
    product_variants?: Array<{
      id: string
      sku: string
      price_list_items?: Array<{
        price: number | string
        cost_price?: number | string | null
      }>
      price?: number
      cost_price?: number | null
    }>
  } | null
}

export interface PurchaseOrder {
  id?: string
  po_id: number | string
  po_number?: number | null
  supplier_id: number | string | null
  warehouse_id?: string | null
  branch_id?: string | null
  store_id?: string | null
  tenant_id?: string
  order_date: string | null
  expected_delivery_date: string | null
  currency_id?: string | null
  currency?: string | null
  currencies?: {
    id: string
    code: string
    name: string
    name_ar?: string | null
    symbol: string
  } | null
  status: PurchaseOrderStatus
  lifecycle_status?: PurchaseOrderLifecycleStatus | null
  payment_status?: string | null
  subtotal?: number | null
  tax_amount?: number | null
  tax_total?: number | null
  discount_amount?: number | null
  discount_total?: number | null
  shipping_amount?: number | null
  grand_total?: number | null
  total_amount: number | null
  notes: string | null
  created_at: string | null
  approved_at?: string | null
  approved_by?: string | null
  sent_at?: string | null
  closed_at?: string | null
  suppliers?: { id?: string; name: string } | null
  warehouses?: { id: string; name: string } | null
  purchase_order_items: PurchaseOrderItem[]
}

export interface PurchaseOrderWithItems extends PurchaseOrder {
  purchase_order_items: PurchaseOrderItem[]
}

export interface PurchaseOrderInput {
  supplier_id: number | string
  warehouse_id?: string | null
  order_date: string
  expected_delivery_date?: string | null
  currency_id?: string | null
  currency?: string | null
  tax_amount?: number | null
  shipping_amount?: number | null
  discount_amount?: number | null
  notes?: string | null
  tenant_id?: string
}

export interface PurchaseOrderItemInput {
  product_id: number | string
  product_variant_id: string | null
  quantity_ordered: number
  unit_cost: number
  tax_amount?: number | null
  discount_amount?: number | null
  subtotal: number
  uom_id?: string | null
  tenant_id?: string
}

// ─── List all POs (Including Warehouses & Suppliers) ────────
export const usePurchaseOrders = () => {
  const { authEnabled } = useAuthEnabled({ permission: 'purchasing.view' })
  return useQuery({
    queryKey: ['purchase-orders'],
    queryFn: async () => {
      const { tenantId } = getAuthTenantAndUser()
      let query = supabase
        .from('purchase_orders')
        .select('*, suppliers(name), warehouses(id, name), currencies(id, code, name, name_ar, symbol)')

      if (tenantId && isValidUuid(tenantId)) {
        query = query.eq('tenant_id', tenantId)
      }

      const { data, error } = await query.order('order_date', { ascending: false })

      if (error) throw error
      return (data || []).map((row) => ({
        ...row,
        po_id: row.id || row.po_id,
        purchase_order_items: row.purchase_order_items || [],
      })) as PurchaseOrder[]
    },
    enabled: authEnabled,
  })
}

// ─── Single PO with items & full relationships ─────────────
export const usePurchaseOrder = (id: number | string) => {
  const { authEnabled } = useAuthEnabled({ permission: 'purchasing.view' })
  const cleanId = String(id || '')
  return useQuery({
    queryKey: ['purchase-orders', cleanId],
    queryFn: async () => {
      if (!cleanId || cleanId === '0') return null
      const { tenantId } = getAuthTenantAndUser()
      let query = supabase
        .from('purchase_orders')
        .select(
          `*, suppliers(name), warehouses(id, name), currencies(id, code, name, name_ar, symbol),
                purchase_order_items(
                  *,
                  uoms(id, name, code, uom_category),
                  products(
                    name,
                    sku,
                    base_uom_id,
                    base_uom:uoms(id, name, code),
                    product_variants(id, sku, price_list_items(price, cost_price))
                  )
                )
              `
        )
        .eq('id', cleanId)

      if (tenantId && isValidUuid(tenantId)) {
        query = query.eq('tenant_id', tenantId)
      }

      const { data, error } = await query.maybeSingle()

      if (error) throw error
      if (!data) return null
      return {
        ...data,
        po_id: data.id || data.po_id,
      } as PurchaseOrderWithItems
    },
    enabled: Boolean(cleanId && cleanId !== '0') && authEnabled,
  })
}

// ─── Create PO with items & financial breakdown ────────────
export const useCreatePurchaseOrder = () => {
  const { has } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      order,
      items,
    }: {
      order: PurchaseOrderInput
      items: PurchaseOrderItemInput[]
    }) => {
      if (!has({ permission: 'purchasing.manage' })) {
        throw new Error('You do not have permission to perform this action.')
      }

      const resolvedTenantId = await resolveClientTenantId(order.tenant_id)
      if (!resolvedTenantId) {
        throw new Error(
          'Tenant ID could not be identified. Please ensure you are logged in.'
        )
      }

      const { userId } = getAuthTenantAndUser()

      // Calculate financial totals
      const itemsSubtotal = items.reduce(
        (sum, item) => sum + (Number(item.subtotal) || 0),
        0
      )
      const taxAmount = Number(order.tax_amount || 0)
      const shippingAmount = Number(order.shipping_amount || 0)
      const discountAmount = Number(order.discount_amount || 0)
      const grandTotal = Math.max(
        0,
        itemsSubtotal + taxAmount + shippingAmount - discountAmount
      )

      const poPayload: Record<string, unknown> = {
        tenant_id: resolvedTenantId,
        supplier_id: String(order.supplier_id),
        warehouse_id: order.warehouse_id || null,
        currency_id: order.currency_id || null,
        order_date: order.order_date,
        expected_delivery_date: order.expected_delivery_date || null,
        currency: order.currency || 'USD',
        notes: order.notes || null,
        subtotal: itemsSubtotal,
        tax_amount: taxAmount,
        tax_total: taxAmount,
        shipping_amount: shippingAmount,
        discount_amount: discountAmount,
        discount_total: discountAmount,
        grand_total: grandTotal,
        total_amount: grandTotal,
        status: 'pending',
        lifecycle_status: 'draft',
      }

      if (userId && isValidUuid(userId)) {
        poPayload.created_by_user_id = userId
        poPayload.updated_by_user_id = userId
      }

      // Insert PO header
      const { data: po, error: poError } = await supabase
        .from('purchase_orders')
        .insert(poPayload)
        .select()
        .maybeSingle()

      if (poError) throw poError

      const resolvedPoId = po.id || po.po_id

      // Insert line items
      if (items.length > 0) {
        const itemsWithPoId = items.map((item, index) => {
          const itemPayload: Record<string, unknown> = {
            tenant_id: resolvedTenantId,
            po_id: resolvedPoId,
            line_no: index + 1,
            product_id: String(item.product_id),
            product_variant_id: item.product_variant_id || null,
            uom_id: item.uom_id || null,
            quantity_ordered: item.quantity_ordered,
            unit_cost: item.unit_cost,
            tax_amount: Number(item.tax_amount || 0),
            discount_amount: Number(item.discount_amount || 0),
            subtotal: item.subtotal,
          }

          if (userId && isValidUuid(userId)) {
            itemPayload.created_by_user_id = userId
            itemPayload.updated_by_user_id = userId
          }

          return itemPayload
        })

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
  const { has } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      order,
      items,
    }: {
      id: number | string
      order: PurchaseOrderInput
      items: PurchaseOrderItemInput[]
    }) => {
      if (!has({ permission: 'purchasing.manage' })) {
        throw new Error('You do not have permission to perform this action.')
      }

      const cleanId = String(id)
      const resolvedTenantId = await resolveClientTenantId(order.tenant_id)
      if (!resolvedTenantId) {
        throw new Error(
          'Tenant ID could not be identified. Please ensure you are logged in.'
        )
      }

      const { userId } = getAuthTenantAndUser()
      const itemsSubtotal = items.reduce(
        (sum, item) => sum + (Number(item.subtotal) || 0),
        0
      )
      const taxAmount = Number(order.tax_amount || 0)
      const shippingAmount = Number(order.shipping_amount || 0)
      const discountAmount = Number(order.discount_amount || 0)
      const grandTotal = Math.max(
        0,
        itemsSubtotal + taxAmount + shippingAmount - discountAmount
      )

      const updatePayload: Record<string, unknown> = {
        supplier_id: String(order.supplier_id),
        warehouse_id: order.warehouse_id || null,
        currency_id: order.currency_id || null,
        order_date: order.order_date,
        expected_delivery_date: order.expected_delivery_date || null,
        currency: order.currency || 'USD',
        notes: order.notes || null,
        subtotal: itemsSubtotal,
        tax_amount: taxAmount,
        tax_total: taxAmount,
        shipping_amount: shippingAmount,
        discount_amount: discountAmount,
        discount_total: discountAmount,
        grand_total: grandTotal,
        total_amount: grandTotal,
      }

      if (userId && isValidUuid(userId)) {
        updatePayload.updated_by_user_id = userId
      }

      // Update PO header
      let poQuery = supabase
        .from('purchase_orders')
        .update(updatePayload)
        .eq('id', cleanId)

      if (resolvedTenantId && isValidUuid(resolvedTenantId)) {
        poQuery = poQuery.eq('tenant_id', resolvedTenantId)
      }

      const { data: po, error: poError } = await poQuery
        .select()
        .maybeSingle()

      if (poError) throw poError

      // Delete existing items and re-insert
      let deleteQuery = supabase
        .from('purchase_order_items')
        .delete()
        .eq('po_id', cleanId)

      if (resolvedTenantId && isValidUuid(resolvedTenantId)) {
        deleteQuery = deleteQuery.eq('tenant_id', resolvedTenantId)
      }

      const { error: deleteError } = await deleteQuery

      if (deleteError) throw deleteError

      if (items.length > 0) {
        const itemsWithPoId = items.map((item, index) => {
          const itemPayload: Record<string, unknown> = {
            tenant_id: resolvedTenantId,
            po_id: cleanId,
            line_no: index + 1,
            product_id: String(item.product_id),
            product_variant_id: item.product_variant_id || null,
            uom_id: item.uom_id || null,
            quantity_ordered: item.quantity_ordered,
            unit_cost: item.unit_cost,
            tax_amount: Number(item.tax_amount || 0),
            discount_amount: Number(item.discount_amount || 0),
            subtotal: item.subtotal,
          }

          if (userId && isValidUuid(userId)) {
            itemPayload.created_by_user_id = userId
            itemPayload.updated_by_user_id = userId
          }

          return itemPayload
        })

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
        queryKey: ['purchase-orders', String(variables.id)],
      })
    },
  })
}

/** Translate legacy status labels to lifecycle statuses (pass-through otherwise). */
const LEGACY_STATUS_MAP: Record<string, PurchaseOrderLifecycleStatus> = {
  pending: 'approved',
  partial: 'partially_received',
  received: 'received',
  cancelled: 'cancelled',
  draft: 'draft',
  approved: 'approved',
  sent: 'sent',
  partially_received: 'partially_received',
  closed: 'closed',
}

export const useUpdatePurchaseOrderStatus = () => {
  const queryClient = useQueryClient()

  return useAuthMutation({
    mutationFn: async (
      getToken,
      {
        id,
        status,
      }: {
        id: number | string
        status: PurchaseOrderStatus
      }
    ) => {
      const mapped =
        LEGACY_STATUS_MAP[status] ?? (status as PurchaseOrderLifecycleStatus)
      const payload = (await authorizedRequest(
        getToken,
        '/api/inventory/purchase-orders/status',
        {
          method: 'POST',
          body: JSON.stringify({ poId: id, status: mapped }),
        }
      )) as { data?: unknown }
      return payload.data ?? null
    },
    rbac: { permission: 'purchasing.manage' },
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
  const { has } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number | string) => {
      if (!has({ permission: 'purchasing.manage' })) {
        throw new Error('You do not have permission to perform this action.')
      }

      const cleanId = String(id)
      const { tenantId } = getAuthTenantAndUser()
      let query = supabase
        .from('purchase_orders')
        .delete()
        .eq('id', cleanId)

      if (tenantId && isValidUuid(tenantId)) {
        query = query.eq('tenant_id', tenantId)
      }

      const { error } = await query

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
    },
  })
}

