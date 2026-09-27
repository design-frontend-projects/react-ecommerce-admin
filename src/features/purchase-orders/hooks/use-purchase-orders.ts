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
import {
  calculatePOLine,
  calculatePOTotals,
  validatePOCalculation,
} from '../utils/po-calculations'

// ─── Lifecycle & Status Types (Prisma po_lifecycle_status_enum) ──
export type PurchaseOrderLifecycleStatus =
  | 'draft'
  | 'approved'
  | 'sent'
  | 'partially_received'
  | 'received'
  | 'closed'
  | 'cancelled'

// Retained as alias for backward compatibility across UI components
export type PurchaseOrderStatus = PurchaseOrderLifecycleStatus

// ─── Prisma-Consistent Models ──────────────────────────────
export interface PurchaseOrderItem {
  id?: string
  po_item_id?: number | string
  po_id: number | string
  line_no?: number
  tenant_id?: string
  product_variant_id: string
  quantity_ordered: number
  unit_cost: number
  tax_amount?: number | null
  discount_amount?: number | null
  subtotal: number
  total_amount?: number | null
  received_quantity: number | null
  cancelled_qty?: number | null
  uom_id?: string | null
  created_at?: string | null
  updated_at?: string | null
  uoms?: {
    id: string
    name: string
    code: string
    uom_category?: string
  } | null
  product_variants?: {
    id: string
    sku: string
    name?: string | null
    barcode?: string | null
    products?: {
      id?: string
      name: string
      sku?: string
      base_uom_id?: string | null
      base_uom?: { id: string; name: string; code: string } | null
    } | null
  } | null
  /** Backward-compatible product accessor populated from variant relation */
  products?: {
    id?: string
    name: string
    sku?: string
    base_uom_id?: string | null
    base_uom?: { id: string; name: string; code: string } | null
    product_variants?: Array<{
      id: string
      sku: string
      name?: string | null
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
  lifecycle_status: PurchaseOrderLifecycleStatus
  /** Backward compatibility status alias mapped to lifecycle_status */
  status: PurchaseOrderStatus
  payment_status?: string | null
  subtotal: number | null
  discount_total: number | null
  tax_total: number | null
  shipping_amount: number | null
  grand_total: number | null
  /** Backward compatibility total alias mapped to grand_total */
  total_amount: number | null
  notes: string | null
  created_at: string | null
  updated_at?: string | null
  approved_at?: string | null
  approved_by?: string | null
  sent_at?: string | null
  closed_at?: string | null
  suppliers?: { id?: string; name: string } | null
  warehouses?: { id: string; name: string; code?: string } | null
  purchase_order_items: PurchaseOrderItem[]
}

export interface PurchaseOrderWithItems extends PurchaseOrder {
  purchase_order_items: PurchaseOrderItem[]
}

export interface PurchaseOrderInput {
  supplier_id: number | string
  warehouse_id?: string | null
  branch_id?: string | null
  store_id?: string | null
  order_date: string
  expected_delivery_date?: string | null
  currency_id?: string | null
  currency?: string | null
  shipping_amount?: number | null
  notes?: string | null
  tenant_id?: string
}

export interface PurchaseOrderItemInput {
  product_variant_id: string
  quantity_ordered: number
  unit_cost: number
  tax_amount?: number | null
  discount_amount?: number | null
  subtotal?: number
  total_amount?: number
  uom_id?: string | null
  tenant_id?: string
  line_no?: number
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
        .select(
          '*, suppliers(id, name), warehouses(id, name, code), currencies(id, code, name, name_ar, symbol)'
        )

      if (tenantId && isValidUuid(tenantId)) {
        query = query.eq('tenant_id', tenantId)
      }

      const { data, error } = await query.order('order_date', { ascending: false })

      if (error) throw error
      return (data || []).map((row) => {
        const lifecycle = (row.lifecycle_status || 'draft') as PurchaseOrderLifecycleStatus
        const grandTotal = Number(row.grand_total ?? row.subtotal ?? 0)
        return {
          ...row,
          po_id: row.id || row.po_id,
          lifecycle_status: lifecycle,
          status: lifecycle,
          grand_total: grandTotal,
          total_amount: grandTotal,
          subtotal: Number(row.subtotal ?? 0),
          discount_total: Number(row.discount_total ?? 0),
          tax_total: Number(row.tax_total ?? 0),
          shipping_amount: Number(row.shipping_amount ?? 0),
          warehouses: Array.isArray(row.warehouses) ? row.warehouses[0] : row.warehouses,
          suppliers: Array.isArray(row.suppliers) ? row.suppliers[0] : row.suppliers,
          currencies: Array.isArray(row.currencies) ? row.currencies[0] : row.currencies,
          purchase_order_items: row.purchase_order_items || [],
        }
      }) as PurchaseOrder[]
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
          `*,
           suppliers(id, name),
           warehouses(id, name, code),
           currencies(id, code, name, name_ar, symbol),
           purchase_order_items(
             *,
             uoms(id, name, code, uom_category),
             product_variants(
               id,
               sku,
               name,
               barcode,
               products(
                 id,
                 name,
                 sku,
                 base_uom_id,
                 base_uom:uoms(id, name, code)
               )
             )
           )`
        )
        .eq('id', cleanId)

      if (tenantId && isValidUuid(tenantId)) {
        query = query.eq('tenant_id', tenantId)
      }

      const { data, error } = await query.maybeSingle()

      if (error) throw error
      if (!data) return null

      const lifecycle = (data.lifecycle_status || 'draft') as PurchaseOrderLifecycleStatus
      const grandTotal = Number(data.grand_total ?? data.subtotal ?? 0)

      const normalizedItems: PurchaseOrderItem[] = (data.purchase_order_items || []).map(
        (item: any) => {
          const variant = item.product_variants
          const product = variant?.products
          return {
            ...item,
            product_variant_id: item.product_variant_id,
            quantity_ordered: Number(item.quantity_ordered ?? 0),
            unit_cost: Number(item.unit_cost ?? 0),
            subtotal: Number(item.subtotal ?? 0),
            discount_amount: Number(item.discount_amount ?? 0),
            tax_amount: Number(item.tax_amount ?? 0),
            total_amount: Number(item.total_amount ?? item.subtotal ?? 0),
            received_quantity: item.received_quantity != null ? Number(item.received_quantity) : null,
            cancelled_qty: item.cancelled_qty != null ? Number(item.cancelled_qty) : null,
            products: product
              ? {
                  id: product.id,
                  name: product.name,
                  sku: product.sku,
                  base_uom_id: product.base_uom_id,
                  base_uom: product.base_uom,
                }
              : null,
            product_variants: variant,
          }
        }
      )

      return {
        ...data,
        po_id: data.id || data.po_id,
        lifecycle_status: lifecycle,
        status: lifecycle,
        grand_total: grandTotal,
        total_amount: grandTotal,
        subtotal: Number(data.subtotal ?? 0),
        discount_total: Number(data.discount_total ?? 0),
        tax_total: Number(data.tax_total ?? 0),
        shipping_amount: Number(data.shipping_amount ?? 0),
        warehouses: Array.isArray(data.warehouses) ? data.warehouses[0] : data.warehouses,
        suppliers: Array.isArray(data.suppliers) ? data.suppliers[0] : data.suppliers,
        currencies: Array.isArray(data.currencies) ? data.currencies[0] : data.currencies,
        purchase_order_items: normalizedItems,
      } as PurchaseOrderWithItems
    },
    enabled: Boolean(cleanId && cleanId !== '0') && authEnabled,
  })
}

// ─── Create PO with items & authoritative financial calculation ────────────
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

      // 1. Authoritative calculations & validation
      const lineInputs = items.map((it, idx) => ({
        product_variant_id: it.product_variant_id,
        quantity_ordered: it.quantity_ordered,
        unit_cost: it.unit_cost,
        discount_amount: it.discount_amount,
        tax_amount: it.tax_amount,
        line_no: idx + 1,
        uom_id: it.uom_id,
      }))

      const adjustments = { shipping_amount: order.shipping_amount }
      const validationErrors = validatePOCalculation(lineInputs, adjustments)
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.map((e) => e.message).join(' | '))
      }

      const calculatedLines = lineInputs.map((it) => calculatePOLine(it))
      const calculatedTotals = calculatePOTotals(calculatedLines, adjustments)

      const { userId } = getAuthTenantAndUser()

      // 2. Prepare payload
      const poPayload: Record<string, unknown> = {
        tenant_id: resolvedTenantId,
        supplier_id: String(order.supplier_id),
        warehouse_id: order.warehouse_id || null,
        branch_id: order.branch_id || null,
        store_id: order.store_id || null,
        currency_id: order.currency_id || null,
        order_date: order.order_date,
        expected_delivery_date: order.expected_delivery_date || null,
        currency: order.currency || 'USD',
        notes: order.notes || null,
        subtotal: calculatedTotals.subtotal,
        tax_total: calculatedTotals.tax_total,
        discount_total: calculatedTotals.discount_total,
        shipping_amount: calculatedTotals.shipping_amount,
        grand_total: calculatedTotals.grand_total,
        lifecycle_status: 'draft',
      }

      if (userId && isValidUuid(userId)) {
        poPayload.created_by_user_id = userId
        poPayload.updated_by_user_id = userId
      }

      // 3. Insert PO header
      const { data: po, error: poError } = await supabase
        .from('purchase_orders')
        .insert(poPayload)
        .select()
        .maybeSingle()

      if (poError) throw poError

      const resolvedPoId = po.id || po.po_id

      // 4. Insert line items
      if (calculatedLines.length > 0) {
        const itemsWithPoId = calculatedLines.map((line) => {
          const itemPayload: Record<string, unknown> = {
            tenant_id: resolvedTenantId,
            po_id: resolvedPoId,
            line_no: line.line_no,
            product_variant_id: line.product_variant_id,
            uom_id: line.uom_id || null,
            quantity_ordered: line.quantity_ordered,
            unit_cost: line.unit_cost,
            subtotal: line.subtotal,
            discount_amount: line.discount_amount,
            tax_amount: line.tax_amount,
            total_amount: line.total_amount,
            received_quantity: 0,
            cancelled_qty: 0,
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

      const lineInputs = items.map((it, idx) => ({
        product_variant_id: it.product_variant_id,
        quantity_ordered: it.quantity_ordered,
        unit_cost: it.unit_cost,
        discount_amount: it.discount_amount,
        tax_amount: it.tax_amount,
        line_no: idx + 1,
        uom_id: it.uom_id,
      }))

      const adjustments = { shipping_amount: order.shipping_amount }
      const validationErrors = validatePOCalculation(lineInputs, adjustments)
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.map((e) => e.message).join(' | '))
      }

      const calculatedLines = lineInputs.map((it) => calculatePOLine(it))
      const calculatedTotals = calculatePOTotals(calculatedLines, adjustments)

      const { userId } = getAuthTenantAndUser()

      const updatePayload: Record<string, unknown> = {
        supplier_id: String(order.supplier_id),
        warehouse_id: order.warehouse_id || null,
        branch_id: order.branch_id || null,
        store_id: order.store_id || null,
        currency_id: order.currency_id || null,
        order_date: order.order_date,
        expected_delivery_date: order.expected_delivery_date || null,
        currency: order.currency || 'USD',
        notes: order.notes || null,
        subtotal: calculatedTotals.subtotal,
        discount_total: calculatedTotals.discount_total,
        tax_total: calculatedTotals.tax_total,
        shipping_amount: calculatedTotals.shipping_amount,
        grand_total: calculatedTotals.grand_total,
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

      if (calculatedLines.length > 0) {
        const itemsWithPoId = calculatedLines.map((line) => {
          const itemPayload: Record<string, unknown> = {
            tenant_id: resolvedTenantId,
            po_id: cleanId,
            line_no: line.line_no,
            product_variant_id: line.product_variant_id,
            uom_id: line.uom_id || null,
            quantity_ordered: line.quantity_ordered,
            unit_cost: line.unit_cost,
            subtotal: line.subtotal,
            discount_amount: line.discount_amount,
            tax_amount: line.tax_amount,
            total_amount: line.total_amount,
            received_quantity: 0,
            cancelled_qty: 0,
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
      const payload = (await authorizedRequest(
        getToken,
        '/api/inventory/purchase-orders/status',
        {
          method: 'POST',
          body: JSON.stringify({ poId: id, status }),
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
