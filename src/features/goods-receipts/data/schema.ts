import { z } from 'zod'

const successEnvelope = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({ success: z.literal(true), data: schema })

export const receiptStatusSchema = z.enum(['draft', 'posted', 'cancelled'])
export type ReceiptStatus = z.infer<typeof receiptStatusSchema>

// ── Inputs ──
export const receiptItemInputSchema = z.object({
  purchaseOrderItemId: z.string().uuid('PO item reference is required.').optional().nullable(),
  productVariantId: z.string().uuid().optional(),
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
  batchId: z.string().uuid().optional().nullable(),
  batchNumber: z.string().optional().nullable(),
  expiryDate: z.string().optional().nullable(),
  serials: z.array(z.string()).optional(),
})

export const createReceiptInputSchema = z.object({
  purchaseOrderId: z.string().uuid('Select a valid Purchase Order.'),
  warehouseId: z.string().uuid('Select a destination warehouse.'),
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
    name: z.string().nullable(),
    code: z.string().optional().nullable(),
  })
  .nullable()

export const receiptListItemSchema = z.object({
  id: z.string().uuid(),
  receipt_number: z.string(),
  status: receiptStatusSchema,
  received_date: z.string(),
  warehouse_id: z.string(),
  purchase_order_id: z.string(),
  notes: z.string().nullable(),
  warehouses: entityRefSchema.optional(),
  suppliers: entityRefSchema.optional(),
  purchase_orders: z
    .object({
      id: z.string().optional(),
      po_number: z.number().nullable().optional(),
      lifecycle_status: z.string().nullable().optional(),
      suppliers: entityRefSchema.optional(),
    })
    .nullable()
    .optional(),
  posted_by_user: z
    .object({
      id: z.string(),
      email: z.string(),
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
  batch_id: z.string().nullable().optional(),
  batch_number: z.string().nullable().optional(),
  expiry_date: z.string().nullable().optional(),
  serials: z.array(z.string()).optional(),
  purchase_order_item_id: z.string().nullable().optional(),
  product_variants: z
    .object({
      id: z.string(),
      sku: z.string(),
      barcode: z.string().nullable().optional(),
      name: z.string().nullable().optional(),
      products: z.object({ name: z.string(), sku: z.string().nullable().optional() }).nullable().optional(),
    })
    .nullable()
    .optional(),
  warehouse_locations: z
    .object({
      id: z.string(),
      code: z.string().optional(),
      path: z.string().nullable().optional(),
      name: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  product_batches: z
    .object({
      id: z.string(),
      batch_number: z.string(),
      expiry_date: z.string().nullable().optional(),
      status: z.string().optional(),
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

// ── Searchable PO Models ──
export const receivablePoSummaryItemSchema = z.object({
  id: z.string().uuid(),
  po_number: z.number().nullable().optional(),
  order_date: z.string().nullable().optional(),
  expected_delivery_date: z.string().nullable().optional(),
  lifecycle_status: z.string(),
  currency: z.string(),
  total_amount: z.number(),
  warehouse_id: z.string(),
  supplier_id: z.string(),
  suppliers: z
    .object({
      id: z.string(),
      name: z.string(),
      code: z.string().nullable().optional(),
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
  items_count: z.number(),
  ordered_quantity: z.number(),
  received_quantity: z.number(),
  remaining_quantity: z.number(),
})

export const searchReceivablePOsResponseSchema = successEnvelope(
  z.object({
    items: z.array(receivablePoSummaryItemSchema),
    pagination: z.object({
      total: z.number(),
      page: z.number(),
      limit: z.number(),
      totalPages: z.number(),
    }),
  })
)

export type ReceivablePoSummaryItem = z.infer<typeof receivablePoSummaryItemSchema>

// ── PO Detailed Receiving Model ──
export const poReceivingItemSchema = z.object({
  id: z.string().uuid(),
  po_id: z.string().uuid(),
  line_no: z.number(),
  product_variant_id: z.string().uuid(),
  product_name: z.string(),
  variant_name: z.string().nullable().optional(),
  sku: z.string(),
  barcode: z.string().nullable().optional(),
  uom: z
    .object({
      id: z.string(),
      name: z.string(),
      code: z.string(),
    })
    .nullable()
    .optional(),
  quantity_ordered: z.number(),
  previously_received_qty: z.number(),
  cancelled_qty: z.number(),
  remaining_quantity: z.number(),
  unit_cost: z.number(),
  total_amount: z.number(),
  receiving_status: z.string(),
  is_batch_tracked: z.boolean(),
  is_serial_tracked: z.boolean(),
  has_expiration: z.boolean(),
  available_batches: z.array(
    z.object({
      id: z.string(),
      batch_number: z.string(),
      expiry_date: z.string().nullable().optional(),
    })
  ),
})

export const poPreviousReceiptSchema = z.object({
  id: z.string().uuid(),
  receipt_number: z.string(),
  status: z.string(),
  received_date: z.string().nullable().optional(),
  posted_at: z.string().nullable().optional(),
  posted_by: z.string().nullable().optional(),
  warehouse: entityRefSchema.optional(),
  items_count: z.number(),
  received_quantity: z.number(),
  accepted_quantity: z.number(),
  rejected_quantity: z.number(),
  notes: z.string().nullable().optional(),
})

export const poReceivingDetailsSchema = z.object({
  header: z.object({
    id: z.string().uuid(),
    po_number: z.number().nullable().optional(),
    order_date: z.string().nullable().optional(),
    expected_delivery_date: z.string().nullable().optional(),
    currency: z.string(),
    lifecycle_status: z.string(),
    po_total: z.number(),
    supplier: z
      .object({
        id: z.string(),
        name: z.string(),
        code: z.string().nullable().optional(),
        email: z.string().nullable().optional(),
        phone: z.string().nullable().optional(),
      })
      .nullable()
      .optional(),
    warehouse: entityRefSchema.optional(),
    notes: z.string().nullable().optional(),
  }),
  summary: z.object({
    total_lines: z.number(),
    ordered_quantity: z.number(),
    received_quantity: z.number(),
    remaining_quantity: z.number(),
    rejected_quantity: z.number(),
    po_total: z.number(),
  }),
  items: z.array(poReceivingItemSchema),
  receipts_history: z.array(poPreviousReceiptSchema),
})

export const poReceivingDetailsResponseSchema = successEnvelope(
  poReceivingDetailsSchema
)

export type PoReceivingDetails = z.infer<typeof poReceivingDetailsSchema>
export type PoReceivingItem = z.infer<typeof poReceivingItemSchema>
export type PoPreviousReceipt = z.infer<typeof poPreviousReceiptSchema>
