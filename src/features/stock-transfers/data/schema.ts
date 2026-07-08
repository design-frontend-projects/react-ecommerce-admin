import { z } from 'zod'

const successEnvelope = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({ success: z.literal(true), data: schema })

// ── Inputs ──
export const transferItemInputSchema = z.object({
  productVariantId: z.string().uuid(),
  qty: z.coerce.number().positive('Quantity must be greater than zero.'),
  unitCost: z.coerce.number().min(0).optional(),
})

export const createTransferInputSchema = z
  .object({
    fromStoreId: z.string().uuid('Select a source store.'),
    toStoreId: z.string().uuid('Select a destination store.'),
    referenceNo: z.string().max(50).optional().nullable(),
    notes: z.string().optional().nullable(),
    items: z.array(transferItemInputSchema).min(1, 'Add at least one item.'),
  })
  .refine((value) => value.fromStoreId !== value.toStoreId, {
    message: 'Source and destination store must differ.',
    path: ['toStoreId'],
  })

export const updateTransferInputSchema = z.object({
  id: z.string().uuid(),
  referenceNo: z.string().max(50).optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(transferItemInputSchema).min(1).optional(),
})

export type TransferItemInput = z.infer<typeof transferItemInputSchema>
export type CreateTransferInput = z.infer<typeof createTransferInputSchema>
export type UpdateTransferInput = z.infer<typeof updateTransferInputSchema>

// ── Responses ──
const storeRefSchema = z
  .object({ store_id: z.string(), name: z.string().nullable() })
  .nullable()

export const transferStatusSchema = z.enum([
  'draft',
  'in_transit',
  'received',
  'cancelled',
])
export type TransferStatus = z.infer<typeof transferStatusSchema>

export const transferListItemSchema = z.object({
  id: z.string().uuid(),
  status: transferStatusSchema,
  reference_no: z.string().nullable(),
  notes: z.string().nullable(),
  from_store_id: z.string(),
  to_store_id: z.string(),
  created_at: z.string(),
  received_at: z.string().nullable(),
  from_store: storeRefSchema,
  to_store: storeRefSchema,
  _count: z.object({ stock_transfer_items: z.number() }).optional(),
})

export const transferItemRowSchema = z.object({
  id: z.string().uuid(),
  product_variant_id: z.string(),
  qty: z.coerce.number(),
  unit_cost: z.coerce.number(),
  product_variants: z
    .object({ id: z.string(), sku: z.string() })
    .nullable()
    .optional(),
})

export const transferDetailSchema = transferListItemSchema.extend({
  stock_transfer_items: z.array(transferItemRowSchema),
})

export type TransferListItem = z.infer<typeof transferListItemSchema>
export type TransferDetail = z.infer<typeof transferDetailSchema>

export const transferListResponseSchema = successEnvelope(
  z.array(transferListItemSchema)
)
export const transferDetailResponseSchema = successEnvelope(transferDetailSchema)
export const transferMutationResponseSchema = successEnvelope(z.unknown())
