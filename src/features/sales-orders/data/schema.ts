import { z } from 'zod'

const successEnvelope = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({ success: z.literal(true), data: schema })

export const orderStatusSchema = z.enum([
  'draft',
  'confirmed',
  'picking',
  'packed',
  'delivered',
  'invoiced',
  'completed',
  'cancelled',
])
export type OrderStatus = z.infer<typeof orderStatusSchema>

export const orderActionSchema = z.enum([
  'confirm',
  'picking',
  'packed',
  'fulfill',
  'invoice',
  'cancel',
  'complete',
])
export type OrderAction = z.infer<typeof orderActionSchema>

// ── Inputs ──
export const orderItemInputSchema = z.object({
  productVariantId: z.string().uuid(),
  qtyOrdered: z.coerce.number().positive('Quantity must be > 0.'),
  unitPrice: z.coerce.number().min(0, 'Unit price cannot be negative.'),
  discountAmount: z.coerce.number().min(0).optional(),
  taxAmount: z.coerce.number().min(0).optional(),
})

export const createOrderInputSchema = z.object({
  storeId: z.string().uuid('Select a store.'),
  customerId: z.coerce.number().int().optional().nullable(),
  expectedDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(orderItemInputSchema).min(1, 'Add at least one item.'),
})

export type OrderItemInput = z.infer<typeof orderItemInputSchema>
export type CreateOrderInput = z.infer<typeof createOrderInputSchema>

// ── Responses ──
const storeRefSchema = z
  .object({ store_id: z.string(), name: z.string().nullable() })
  .nullable()

const customerRefSchema = z
  .object({
    customer_id: z.number(),
    first_name: z.string().nullable(),
    last_name: z.string().nullable(),
  })
  .nullable()

export const orderListItemSchema = z.object({
  id: z.string().uuid(),
  order_number: z.string(),
  status: orderStatusSchema,
  customer_id: z.number().nullable(),
  store_id: z.string(),
  order_date: z.string(),
  expected_date: z.string().nullable(),
  subtotal: z.coerce.number(),
  discount_amount: z.coerce.number(),
  tax_amount: z.coerce.number(),
  total_amount: z.coerce.number(),
  sales_invoice_id: z.string().nullable(),
  notes: z.string().nullable(),
  created_at: z.string(),
  stores: storeRefSchema,
  customers: customerRefSchema,
  _count: z.object({ sales_order_items: z.number() }).optional(),
})

export const orderItemRowSchema = z.object({
  id: z.string().uuid(),
  product_variant_id: z.string(),
  line_no: z.number(),
  qty_ordered: z.coerce.number(),
  qty_reserved: z.coerce.number(),
  qty_fulfilled: z.coerce.number(),
  unit_price: z.coerce.number(),
  discount_amount: z.coerce.number(),
  tax_amount: z.coerce.number(),
  line_total: z.coerce.number(),
  product_variants: z
    .object({
      id: z.string(),
      sku: z.string(),
      products: z.object({ name: z.string() }).nullable().optional(),
    })
    .nullable()
    .optional(),
})

export const orderDetailSchema = orderListItemSchema.extend({
  sales_order_items: z.array(orderItemRowSchema),
})

export type OrderListItem = z.infer<typeof orderListItemSchema>
export type OrderItemRow = z.infer<typeof orderItemRowSchema>
export type OrderDetail = z.infer<typeof orderDetailSchema>

export const orderListResponseSchema = successEnvelope(
  z.array(orderListItemSchema)
)
export const orderDetailResponseSchema = successEnvelope(orderDetailSchema)

export function customerName(
  customer: z.infer<typeof customerRefSchema>
): string {
  if (!customer) return 'Walk-in'
  const name = [customer.first_name, customer.last_name]
    .filter(Boolean)
    .join(' ')
  return name || 'Walk-in'
}
