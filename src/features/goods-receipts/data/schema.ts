import { z } from 'zod'

const successEnvelope = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({ success: z.literal(true), data: schema })

export const receiptStatusSchema = z.enum(['draft', 'posted', 'cancelled'])
export type ReceiptStatus = z.infer<typeof receiptStatusSchema>

// ── Inputs ──
export const receiptItemInputSchema = z.object({
  productVariantId: z.string().uuid('Select a variant.'),
  qtyReceived: z.coerce.number().positive('Quantity must be > 0.'),
  acceptedQty: z.coerce.number().min(0).optional(),
  rejectedQty: z.coerce.number().min(0).optional(),
  rejectionReason: z.string().optional().nullable(),
  condition: z.string().default('good').optional(),
  unitCost: z.coerce
    .number()
    .min(0, 'Unit cost cannot be negative.')
    .optional(),
  warehouseLocationId: z.string().uuid().optional().nullable(),
  batchNumber: z.string().optional().nullable(),
  batchId: z.string().uuid().optional().nullable(),
  serialId: z.string().uuid().optional().nullable(),
  expiryDate: z.string().optional().nullable(),
  serialNumbers: z.array(z.string()).optional(),
  purchaseOrderItemId: z.string().uuid().optional().nullable(),
})

export const createReceiptInputSchema = z.object({
  warehouseId: z.string().uuid().optional().nullable(),
  storeId: z.string().uuid().optional().nullable(),
  purchaseOrderId: z.string().uuid().optional().nullable(),
  supplierId: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(receiptItemInputSchema).min(1, 'Add at least one item.'),
  autoPost: z.boolean().optional(),
})

export type ReceiptItemInput = z.infer<typeof receiptItemInputSchema>
export type CreateReceiptInput = z.infer<typeof createReceiptInputSchema>

// ── Responses ──
const entityRefSchema = z
  .object({
    id: z.string().optional(),
    store_id: z.string().optional(),
    name: z.string().nullable(),
    code: z.string().optional().nullable(),
  })
  .nullable()

export const receiptListItemSchema = z.object({
  id: z.string().uuid(),
  receipt_number: z.string(),
  status: receiptStatusSchema,
  received_date: z.string(),
  warehouse_id: z.string().nullable().optional(),
  store_id: z.string().nullable().optional(),
  purchase_order_id: z.string().nullable().optional(),
  supplier_id: z.string().nullable().optional(),
  notes: z.string().nullable(),
  warehouses: entityRefSchema.optional(),
  stores: entityRefSchema.optional(),
  suppliers: entityRefSchema.optional(),
  purchase_orders: z
    .object({
      id: z.string().optional(),
      po_number: z.number().nullable().optional(),
      lifecycle_status: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  _count: z.object({ goods_receipt_items: z.number() }).optional(),
})

export const receiptItemRowSchema = z.object({
  id: z.string().uuid(),
  product_variant_id: z.string(),
  qty_received: z.coerce.number(),
  accepted_qty: z.coerce.number().optional().nullable(),
  rejected_qty: z.coerce.number().optional().nullable(),
  rejection_reason: z.string().nullable().optional(),
  condition: z.string().default('good').optional(),
  unit_cost: z.coerce.number(),
  batch_number: z.string().nullable().optional(),
  batch_id: z.string().nullable().optional(),
  serial_id: z.string().nullable().optional(),
  expiry_date: z.string().nullable().optional(),
  serial_numbers: z.unknown().nullable().optional(),
  purchase_order_item_id: z.string().nullable().optional(),
  product_variants: z
    .object({
      id: z.string(),
      sku: z.string(),
      barcode: z.string().nullable().optional(),
      products: z.object({ name: z.string() }).nullable().optional(),
    })
    .nullable()
    .optional(),
  warehouse_locations: z
    .object({
      id: z.string(),
      code: z.string().optional(),
      path: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
})

export const receiptDetailSchema = receiptListItemSchema.extend({
  goods_receipt_items: z.array(receiptItemRowSchema),
})

export type ReceiptListItem = z.infer<typeof receiptListItemSchema>
export type ReceiptItemRow = z.infer<typeof receiptItemRowSchema>
export type ReceiptDetail = z.infer<typeof receiptDetailSchema>

export const receiptListResponseSchema = successEnvelope(
  z.array(receiptListItemSchema)
)
export const receiptDetailResponseSchema = successEnvelope(receiptDetailSchema)

// ── Receivable Purchase Orders ──
export const receivablePoItemSchema = z.object({
  id: z.string().uuid(),
  po_id: z.string().uuid(),
  line_no: z.number(),
  quantity_ordered: z.number(),
  unit_cost: z.coerce.number(),
  received_quantity: z.coerce.number().nullable().optional(),
  outstanding_qty: z.number(),
  product_id: z.string().uuid().nullable().optional(),
  product_variant_id: z.string().uuid().nullable().optional(),
  products: z
    .object({
      name: z.string(),
      sku: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  product_variants: z
    .object({
      id: z.string(),
      sku: z.string(),
    })
    .nullable()
    .optional(),
  has_expiration: z.boolean().nullable().optional(),
  expiration_date: z.string().nullable().optional(),
})

export const receivablePurchaseOrderSchema = z.object({
  id: z.string().uuid(),
  po_number: z.number().nullable().optional(),
  order_date: z.string().nullable().optional(),
  supplier_id: z.string().uuid().nullable().optional(),
  warehouse_id: z.string().uuid().nullable().optional(),
  lifecycle_status: z.string().nullable().optional(),
  suppliers: z
    .object({
      id: z.string(),
      name: z.string(),
    })
    .nullable()
    .optional(),
  warehouses: z
    .object({
      id: z.string(),
      name: z.string(),
      code: z.string(),
    })
    .nullable()
    .optional(),
  purchase_order_items: z.array(receivablePoItemSchema),
})

export type ReceivablePurchaseOrder = z.infer<typeof receivablePurchaseOrderSchema>
export type ReceivablePoItem = z.infer<typeof receivablePoItemSchema>

export const receivablePoListResponseSchema = successEnvelope(
  z.array(receivablePurchaseOrderSchema)
)
