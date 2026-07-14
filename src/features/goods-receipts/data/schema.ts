import { z } from 'zod'

const successEnvelope = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({ success: z.literal(true), data: schema })

export const receiptStatusSchema = z.enum(['draft', 'posted', 'cancelled'])
export type ReceiptStatus = z.infer<typeof receiptStatusSchema>

// ── Inputs ──
export const receiptItemInputSchema = z.object({
  productVariantId: z.string().uuid('Select a variant.'),
  qtyReceived: z.coerce.number().positive('Quantity must be > 0.'),
  unitCost: z.coerce
    .number()
    .min(0, 'Unit cost cannot be negative.')
    .optional(),
  warehouseLocationId: z.string().uuid().optional(),
  batchNumber: z.string().optional(),
  expiryDate: z.string().optional(),
  serialNumbers: z.array(z.string()).optional(),
})

export const createReceiptInputSchema = z.object({
  storeId: z.string().uuid('Select a store.'),
  purchaseOrderId: z.coerce.number().int().positive().optional().nullable(),
  supplierId: z.coerce.number().int().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(receiptItemInputSchema).min(1, 'Add at least one item.'),
})

export type ReceiptItemInput = z.infer<typeof receiptItemInputSchema>
export type CreateReceiptInput = z.infer<typeof createReceiptInputSchema>

// ── Responses ──
const storeRefSchema = z
  .object({ store_id: z.string(), name: z.string().nullable() })
  .nullable()

const supplierRefSchema = z
  .object({ supplier_id: z.number(), name: z.string().nullable() })
  .nullable()

export const receiptListItemSchema = z.object({
  id: z.string().uuid(),
  receipt_number: z.string(),
  status: receiptStatusSchema,
  received_date: z.string(),
  purchase_order_id: z.number().nullable(),
  notes: z.string().nullable(),
  stores: storeRefSchema,
  suppliers: supplierRefSchema,
  _count: z.object({ goods_receipt_items: z.number() }).optional(),
})

export const receiptItemRowSchema = z.object({
  id: z.string().uuid(),
  qty_received: z.coerce.number(),
  unit_cost: z.coerce.number(),
  batch_number: z.string().nullable(),
  expiry_date: z.string().nullable(),
  serial_numbers: z.unknown().nullable(),
  product_variants: z
    .object({
      id: z.string(),
      sku: z.string(),
      products: z.object({ name: z.string() }).nullable(),
    })
    .nullable(),
  warehouse_locations: z
    .object({ id: z.string(), path: z.string().nullable() })
    .nullable(),
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
