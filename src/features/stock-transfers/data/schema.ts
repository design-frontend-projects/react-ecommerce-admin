import { z } from 'zod'

const successEnvelope = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({ success: z.literal(true), data: schema })

// ── Inputs ──
export const transferItemInputSchema = z.object({
  productVariantId: z.string().uuid(),
  sourceLocationId: z.string().uuid().optional().nullable(),
  destinationLocationId: z.string().uuid().optional().nullable(),
  qty: z.coerce.number().positive('Quantity must be greater than zero.'),
  unitCost: z.coerce.number().min(0).optional(),
  batchId: z.string().uuid().optional().nullable(),
  serialId: z.string().uuid().optional().nullable(),
})

export const createTransferInputSchema = z
  .object({
    sourceWarehouseId: z.string().uuid().optional().nullable(),
    destinationWarehouseId: z.string().uuid().optional().nullable(),
    fromStoreId: z.string().uuid().optional().nullable(),
    toStoreId: z.string().uuid().optional().nullable(),
    fromBranchId: z.string().uuid().optional().nullable(),
    toBranchId: z.string().uuid().optional().nullable(),
    referenceNo: z.string().max(50).optional().nullable(),
    notes: z.string().optional().nullable(),
    items: z.array(transferItemInputSchema).min(1, 'Add at least one item.'),
  })
  .refine(
    (value) => {
      const source = value.sourceWarehouseId || value.fromStoreId
      const dest = value.destinationWarehouseId || value.toStoreId
      return source && dest && source !== dest
    },
    {
      message: 'Source and destination must be selected and different.',
      path: ['destinationWarehouseId'],
    }
  )

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
const entityRefSchema = z
  .object({ id: z.string().optional(), store_id: z.string().optional(), name: z.string().nullable(), code: z.string().optional().nullable() })
  .nullable()

export const transferStatusSchema = z.enum([
  'draft',
  'approved',
  'picked',
  'in_transit',
  'received',
  'completed',
  'cancelled',
])
export type TransferStatus = z.infer<typeof transferStatusSchema>

export const transferListItemSchema = z.object({
  id: z.string().uuid(),
  transfer_no: z.coerce.string().nullable().optional(),
  status: transferStatusSchema,
  reference_no: z.string().nullable(),
  notes: z.string().nullable(),
  source_warehouse_id: z.string().nullable().optional(),
  destination_warehouse_id: z.string().nullable().optional(),
  from_store_id: z.string().nullable().optional(),
  to_store_id: z.string().nullable().optional(),
  created_at: z.string(),
  approved_at: z.string().nullable().optional(),
  shipped_at: z.string().nullable().optional(),
  received_at: z.string().nullable().optional(),
  source_warehouse: entityRefSchema.optional(),
  destination_warehouse: entityRefSchema.optional(),
  from_store: entityRefSchema.optional(),
  to_store: entityRefSchema.optional(),
  _count: z.object({ stock_transfer_items: z.number() }).optional(),
})

export const transferItemRowSchema = z.object({
  id: z.string().uuid(),
  product_variant_id: z.string(),
  qty: z.coerce.number(),
  received_qty: z.coerce.number().optional().default(0),
  unit_cost: z.coerce.number(),
  source_location_id: z.string().nullable().optional(),
  destination_location_id: z.string().nullable().optional(),
  batch_id: z.string().nullable().optional(),
  serial_id: z.string().nullable().optional(),
  product_variants: z
    .object({ id: z.string(), sku: z.string(), barcode: z.string().nullable().optional() })
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
export const transferDetailResponseSchema =
  successEnvelope(transferDetailSchema)
export const transferMutationResponseSchema = successEnvelope(z.unknown())

