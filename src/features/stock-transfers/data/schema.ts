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
const optionalUuid = z.preprocess(
  (val) => (val === '' || val === undefined ? null : val),
  z.string().uuid('Must be a valid UUID.').nullable().optional()
)

export const transferItemInputSchema = z.object({
  productVariantId: z.string().uuid('Please select a valid variant.'),
  sourceLocationId: optionalUuid,
  destinationLocationId: optionalUuid,
  qty: z.coerce.number().positive('Quantity must be greater than zero.'),
  unitCost: z.coerce.number().min(0, 'Cost must be non-negative.').optional().default(0),
  condition: stockConditionSchema.default('good'),
  batchId: optionalUuid,
  serialId: optionalUuid,
})

export const createTransferInputSchema = z
  .object({
    transferType: z.enum(['warehouse', 'store', 'branch']).default('warehouse'),
    sourceWarehouseId: optionalUuid,
    destinationWarehouseId: optionalUuid,
    fromStoreId: optionalUuid,
    toStoreId: optionalUuid,
    fromBranchId: optionalUuid,
    toBranchId: optionalUuid,
    referenceNo: z.preprocess(
      (val) => (val === '' || val === undefined ? null : val),
      z.string().max(50).nullable().optional()
    ),
    notes: z.preprocess(
      (val) => (val === '' || val === undefined ? null : val),
      z.string().nullable().optional()
    ),
    items: z.array(transferItemInputSchema).min(1, 'Add at least one item to transfer.'),
  })
  .superRefine((value, ctx) => {
    if (value.transferType === 'warehouse') {
      if (!value.sourceWarehouseId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Source warehouse is required.',
          path: ['sourceWarehouseId'],
        })
      }
      if (!value.destinationWarehouseId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Destination warehouse is required.',
          path: ['destinationWarehouseId'],
        })
      } else if (
        value.sourceWarehouseId &&
        value.sourceWarehouseId === value.destinationWarehouseId
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Destination warehouse must differ from source warehouse.',
          path: ['destinationWarehouseId'],
        })
      }
    } else if (value.transferType === 'store') {
      if (!value.fromStoreId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Source store is required.',
          path: ['fromStoreId'],
        })
      }
      if (!value.toStoreId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Destination store is required.',
          path: ['toStoreId'],
        })
      } else if (value.fromStoreId && value.fromStoreId === value.toStoreId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Destination store must differ from source store.',
          path: ['toStoreId'],
        })
      }
    } else if (value.transferType === 'branch') {
      if (!value.fromBranchId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Source branch is required.',
          path: ['fromBranchId'],
        })
      }
      if (!value.toBranchId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Destination branch is required.',
          path: ['toBranchId'],
        })
      } else if (
        value.fromBranchId &&
        value.fromBranchId === value.toBranchId
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Destination branch must differ from source branch.',
          path: ['toBranchId'],
        })
      }
    }
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

export const inventoryMovementRecordSchema = z.object({
  id: z.string(),
  movement_no: z.coerce.string().nullable().optional(),
  movement_type: z.string(),
  status: z.string().nullable().optional(),
  quantity_delta: z.coerce.number(),
  unit_cost: z.coerce.number().nullable().optional(),
  total_cost: z.coerce.number().nullable().optional(),
  qty_before: z.coerce.number().nullable().optional(),
  qty_after: z.coerce.number().nullable().optional(),
  warehouse_id: z.string().nullable().optional(),
  store_id: z.string().nullable().optional(),
  product_variant_id: z.string().nullable().optional(),
  movement_date: z.string().nullable().optional(),
  occurred_at: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  created_by: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  warehouses: z
    .object({
      id: z.string().optional(),
      name: z.string().nullable().optional(),
      code: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  product_variants: z
    .object({
      id: z.string().optional(),
      sku: z.string().optional(),
      products: z
        .object({
          name: z.string().optional(),
        })
        .nullable()
        .optional(),
    })
    .nullable()
    .optional(),
})

export type InventoryMovementRecord = z.infer<
  typeof inventoryMovementRecordSchema
>

export const transferItemRowSchema = z.object({
  id: z.string().uuid(),
  product_variant_id: z.string(),
  qty: z.coerce.number(),
  received_qty: z.coerce.number().optional().default(0),
  unit_cost: z.coerce.number().optional().default(0),
  list_price: z.coerce.number().nullable().optional(),
  weight: z.coerce.number().nullable().optional(),
  uom: z.string().nullable().optional(),
  brand: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  price_list_name: z.string().nullable().optional(),
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
      name: z.string().nullable().optional(),
      barcode: z.string().nullable().optional(),
      weight: z.coerce.number().nullable().optional(),
      price: z.coerce.number().nullable().optional(),
      cost_price: z.coerce.number().nullable().optional(),
      uom: z.string().nullable().optional(),
      brand: z.string().nullable().optional(),
      category: z.string().nullable().optional(),
      price_list_name: z.string().nullable().optional(),
      products: z
        .object({
          id: z.string().optional(),
          name: z.string(),
          sku: z.string().nullable().optional(),
          barcode: z.string().nullable().optional(),
          brand_name: z.string().nullable().optional(),
          category_name: z.string().nullable().optional(),
          uom_name: z.string().nullable().optional(),
        })
        .nullable()
        .optional(),
    })
    .nullable()
    .optional(),
})

export const transferDetailSchema = transferListItemSchema.extend({
  stock_transfer_items: z.array(transferItemRowSchema),
  inventory_movements: z.array(inventoryMovementRecordSchema).optional().default([]),
  total_weight: z.coerce.number().nullable().optional(),
  total_price_valuation: z.coerce.number().nullable().optional(),
  total_cost_valuation: z.coerce.number().nullable().optional(),
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


