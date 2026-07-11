import { supabase } from '@/lib/supabase'
import { generateOrderNumber } from '../lib/formatters'
import type { OrderChannel, ResOrder } from '../types'

export { generateOrderNumber }

export interface CreateResOrderPayload {
  tableId?: string
  orderType?: OrderChannel
  shiftId?: string
  createdBy?: string
  customerName?: string
  customerMobile?: string
  appliedPromotionId?: number
  promoDiscountAmount?: number
  discountAmount?: number
  discountType?: string
  taxAmount?: number
  totalAmount?: number
  items: Array<{
    item_id: string
    variant_id?: string
    quantity: number
    unit_price: number
    properties?: unknown[]
    notes?: string
  }>
}

export async function createResOrder(
  payload: CreateResOrderPayload
): Promise<ResOrder> {
  const orderType: OrderChannel = payload.orderType ?? 'dine_in'
  if (orderType === 'dine_in' && !payload.tableId) {
    throw new Error('Table is required for dine-in orders')
  }

  const orderNumber = generateOrderNumber()
  const subtotal = payload.items.reduce(
    (sum, item) => sum + item.unit_price * item.quantity,
    0
  )
  const totalDiscount =
    (payload.promoDiscountAmount || 0) + (payload.discountAmount || 0)

  const { data: order, error: orderError } = await supabase
    .from('res_orders')
    .insert({
      order_number: orderNumber,
      table_id: orderType === 'dine_in' ? payload.tableId : null,
      order_type: orderType,
      shift_id: payload.shiftId,
      created_by: payload.createdBy,
      customer_name: payload.customerName,
      mobile_number: payload.customerMobile,
      status: 'open',
      subtotal,
      discount_amount: payload.discountAmount ?? 0,
      discount_type: payload.discountType,
      tax_amount: payload.taxAmount ?? 0,
      total_amount:
        payload.totalAmount ?? Math.max(0, subtotal - totalDiscount),
      applied_promotion_id: payload.appliedPromotionId,
      promo_discount_amount: payload.promoDiscountAmount ?? 0,
    })
    .select()
    .maybeSingle()

  if (orderError) throw orderError

  // Create order items
  const orderItems = payload.items.map((item) => ({
    order_id: order.id,
    item_id: item.item_id,
    variant_id: item.variant_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    properties: item.properties || [],
    notes: item.notes,
  }))

  const { error: itemsError } = await supabase
    .from('res_order_items')
    .insert(orderItems)

  if (itemsError) throw itemsError

  // Update table status
  if (orderType === 'dine_in' && payload.tableId) {
    await supabase
      .from('res_tables')
      .update({ status: 'occupied' })
      .eq('id', payload.tableId)
  }

  return order as ResOrder
}
