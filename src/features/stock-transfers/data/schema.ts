import { z } from 'zod'

const successEnvelope = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({ success: z.literal(true), data: schema })

// ── Enums ──
export const stockConditionSchema = z.enum([
  'good',
  'damaged',
  'quarantine',
  'expired',
  'blocked',
])
export type StockCondition = z.infer<typeof stockConditionSchema>

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

// ── Inputs ──
export const transferItemInputSchema = z.object({
  productVariantId: z.string().uuid('Please select a valid variant.'),
  sourceLocationId: z.string().uuid().optional().nullable(),
  destinationLocationId: z.string().uuid().optional().nullable(),
  qty: z.coerce.number().positive('Quantity must be greater than zero.'),
  unitCost: z.coerce.number().min(0, 'Cost must be non-negative.').optional().default(0),
  condition: stockConditionSchema.default('good'),
  batchId: z.string().uuid().optional().nullable(),
  serialId: z.string().uuid().optional().nullable(),
})

export const createTransferInputSchema = z
  .object({
    transferType: z.enum(['warehouse', 'store', 'branch']).default('warehouse'),
    sourceWarehouseId: z.string().uuid().optional().nullable(),
    destinationWarehouseId: z.string().uuid().optional().nullable(),
    fromStoreId: z.string().uuid().optional().nullable(),
    toStoreId: z.string().uuid().optional().nullable(),
    fromBranchId: z.string().uuid().optional().nullable(),
    toBranchId: z.string().uuid().optional().nullable(),
    referenceNo: z.string().max(50).optional().nullable(),
    notes: z.string().optional().nullable(),
    items: z.array(transferItemInputSchema).min(1, 'Add at least one item to transfer.'),
  })
  .refine(
    (value) => {
      if (value.transferType === 'warehouse') {
        return (
          Boolean(value.sourceWarehouseId) &&
          Boolean(value.destinationWarehouseId) &&
          value.sourceWarehouseId !== value.destinationWarehouseId
        )
      }
      if (value.transferType === 'store') {
        return (
          Boolean(value.fromStoreId) &&
          Boolean(value.toStoreId) &&
          value.fromStoreId !== value.toStoreId
        )
      }
      if (value.transferType === 'branch') {
        return (
          Boolean(value.fromBranchId) &&
          Boolean(value.toBranchId) &&
          value.fromBranchId !== value.toBranchId
        )
      }
      const source =
        value.sourceWarehouseId || value.fromStoreId || value.fromBranchId
      const dest =
        value.destinationWarehouseId || value.toStoreId || value.toBranchId
      return Boolean(source && dest && source !== dest)
    },
    {
      message: 'Source and destination must be selected and cannot be the same.',
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
  .object({
    id: z.string().optional(),
    store_id: z.string().optional(),
    name: z.string().nullable(),
    code: z.string().optional().nullable(),
  })
  .nullable()

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
  from_branch_id: z.string().nullable().optional(),
  to_branch_id: z.string().nullable().optional(),
  created_by: z.string().nullable().optional(),
  approved_by: z.string().nullable().optional(),
  shipped_by: z.string().nullable().optional(),
  received_by: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string().nullable().optional(),
  approved_at: z.string().nullable().optional(),
  shipped_at: z.string().nullable().optional(),
  received_at: z.string().nullable().optional(),
  source_warehouse: entityRefSchema.optional(),
  destination_warehouse: entityRefSchema.optional(),
  from_store: entityRefSchema.optional(),
  to_store: entityRefSchema.optional(),
  from_branch: entityRefSchema.optional(),
  to_branch: entityRefSchema.optional(),
  _count: z.object({ stock_transfer_items: z.number().optional() }).optional(),
})

export const transferItemRowSchema = z.object({
  id: z.string().uuid(),
  product_variant_id: z.string(),
  qty: z.coerce.number(),
  received_qty: z.coerce.number().optional().default(0),
  unit_cost: z.coerce.number().optional().default(0),
  condition: stockConditionSchema.default('good'),
  source_location_id: z.string().nullable().optional(),
  destination_location_id: z.string().nullable().optional(),
  batch_id: z.string().nullable().optional(),
  serial_id: z.string().nullable().optional(),
  source_location: entityRefSchema.optional(),
  destination_location: entityRefSchema.optional(),
  product_variants: z
    .object({
      id: z.string(),
      sku: z.string(),
      barcode: z.string().nullable().optional(),
      products: z
        .object({
          id: z.string().optional(),
          name: z.string(),
        })
        .nullable()
        .optional(),
    })
    .nullable()
    .optional(),
})

export const transferDetailSchema = transferListItemSchema.extend({
  stock_transfer_items: z.array(transferItemRowSchema),
})

export type TransferListItem = z.infer<typeof transferListItemSchema>
export type TransferDetail = z.infer<typeof transferDetailSchema>
export type TransferItemRow = z.infer<typeof transferItemRowSchema>

export const transferListResponseSchema = successEnvelope(
  z.array(transferListItemSchema)
)
export const transferDetailResponseSchema =
  successEnvelope(transferDetailSchema)
export const transferMutationResponseSchema = successEnvelope(z.unknown())

