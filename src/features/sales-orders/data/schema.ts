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
  productVariantId: z.string().uuid('Select a product variant.'),
  qtyOrdered: z.coerce.number().positive('Quantity must be > 0.'),
  unitPrice: z.coerce.number().min(0, 'Unit price cannot be negative.'),
  discountAmount: z.coerce.number().min(0).optional().default(0),
  taxAmount: z.coerce.number().min(0).optional().default(0),
  uomId: z.string().uuid().optional().nullable(),
})

export const createOrderInputSchema = z.object({
  storeId: z.string().uuid('Select a store.'),
  warehouseId: z.string().uuid().optional().nullable(),
  customerId: z.string().uuid().optional().nullable(),
  channelId: z.string().uuid().optional().nullable(),
  currency: z.string().optional().default('USD'),
  expectedDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(orderItemInputSchema).min(1, 'Add at least one item.'),
})

export type OrderItemInput = z.infer<typeof orderItemInputSchema>
export type CreateOrderInput = z.infer<typeof createOrderInputSchema>

// ── References ──
export const storeRefSchema = z
  .object({
    id: z.string().optional(),
    store_id: z.string().optional(),
    name: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
  })
  .nullable()
  .optional()

export const warehouseRefSchema = z
  .object({
    id: z.string(),
    name: z.string().nullable().optional(),
    code: z.string().nullable().optional(),
  })
  .nullable()
  .optional()

export const channelRefSchema = z
  .object({
    id: z.string(),
    name: z.string().nullable().optional(),
    code: z.string().nullable().optional(),
  })
  .nullable()
  .optional()

export const customerRefSchema = z
  .object({
    id: z.string().optional(),
    customer_id: z.union([z.number(), z.string()]).optional(),
    first_name: z.string().nullable().optional(),
    last_name: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    code: z.string().nullable().optional(),
    address_line1: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    postal_code: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
  })
  .nullable()
  .optional()

export const uomRefSchema = z
  .object({
    id: z.string(),
    name: z.string().nullable().optional(),
    code: z.string().nullable().optional(),
  })
  .nullable()
  .optional()

export const orderListItemSchema = z.object({
  id: z.string().uuid(),
  order_number: z.string(),
  status: orderStatusSchema,
  customer_id: z.string().nullable().optional(),
  store_id: z.string().nullable().optional(),
  warehouse_id: z.string().nullable().optional(),
  channel_id: z.string().nullable().optional(),
  currency: z.string().nullable().optional(),
  order_date: z.string(),
  expected_date: z.string().nullable().optional(),
  subtotal: z.coerce.number(),
  discount_amount: z.coerce.number(),
  tax_amount: z.coerce.number(),
  total_amount: z.coerce.number(),
  sales_invoice_id: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  created_at: z.string(),
  stores: storeRefSchema,
  warehouses: warehouseRefSchema,
  channels: channelRefSchema,
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
  uom_id: z.string().nullable().optional(),
  unit_price: z.coerce.number(),
  discount_amount: z.coerce.number(),
  tax_amount: z.coerce.number(),
  line_total: z.coerce.number(),
  product_variants: z
    .object({
      id: z.string(),
      sku: z.string(),
      name: z.string().nullable().optional(),
      products: z
        .object({
          id: z.string().optional(),
          name: z.string(),
          sku: z.string().optional(),
        })
        .nullable()
        .optional(),
    })
    .nullable()
    .optional(),
  uoms: uomRefSchema,
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
  customer?: z.infer<typeof customerRefSchema>
): string {
  if (!customer) return 'Walk-in'
  const name = [customer.first_name, customer.last_name]
    .filter(Boolean)
    .join(' ')
  return name || (customer.code ? `Customer #${customer.code}` : 'Walk-in')
}
