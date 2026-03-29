import { supabase } from '@/lib/supabase'
import { generateOrderNumber } from '../lib/formatters'
import { ResOrder } from '../types'

export { generateOrderNumber }

export async function createResOrder(payload: {
  tableId?: string
  shiftId?: string
  createdBy?: string
  customerName?: string
  items: Array<{
    item_id: string
    variant_id?: string
    quantity: number
    unit_price: number
    properties?: unknown[]
    notes?: string
  }>
}): Promise<ResOrder> {
  const orderNumber = generateOrderNumber()
  const subtotal = payload.items.reduce(
    (sum, item) => sum + item.unit_price * item.quantity,
    0
  )

  const { data: order, error: orderError } = await supabase
    .from('res_orders')
    .insert({
      order_number: orderNumber,
      table_id: payload.tableId,
      shift_id: payload.shiftId,
      created_by: payload.createdBy,
      customer_name: payload.customerName,
      status: 'open',
      subtotal,
      total_amount: subtotal,
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
  if (payload.tableId) {
    await supabase
      .from('res_tables')
      .update({ status: 'occupied' })
      .eq('id', payload.tableId)
  }

  return order as ResOrder
}
