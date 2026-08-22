import { z } from 'zod'

const successEnvelope = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({ success: z.literal(true), data: schema })

export const adjustmentTypeSchema = z.enum(['manual', 'damage', 'stocktake'])
export type AdjustmentType = z.infer<typeof adjustmentTypeSchema>

export const adjustmentReasonSchema = z.enum([
  'damage',
  'expired',
  'theft',
  'data_entry_error',
  'stocktake_discrepancy',
  'count_correction',
  'loss',
  'found',
  'system_correction',
  'other',
])
export type AdjustmentReason = z.infer<typeof adjustmentReasonSchema>

export const adjustmentStatusSchema = z.enum([
  'draft',
  'pending',
  'approved',
  'cancelled',
])
export type AdjustmentStatus = z.infer<typeof adjustmentStatusSchema>

// ── Inputs ──
export const adjustmentItemInputSchema = z.object({
  productVariantId: z.string().uuid(),
  locationId: z.string().uuid().optional().nullable(),
  qty: z.coerce.number(),
  reason: adjustmentReasonSchema.optional(),
  unitCost: z.coerce.number().min(0).optional(),
  batchId: z.string().uuid().optional().nullable(),
})

export const createAdjustmentInputSchema = z.object({
  warehouseId: z.string().uuid().optional().nullable(),
  storeId: z.string().uuid().optional().nullable(),
  type: adjustmentTypeSchema,
  notes: z.string().optional().nullable(),
  items: z.array(adjustmentItemInputSchema).min(1, 'Add at least one item.'),
})

export type AdjustmentItemInput = z.infer<typeof adjustmentItemInputSchema>
export type CreateAdjustmentInput = z.infer<typeof createAdjustmentInputSchema>

// ── Responses ──
const entityRefSchema = z
  .object({ id: z.string().optional(), store_id: z.string().optional(), name: z.string().nullable(), code: z.string().optional().nullable() })
  .nullable()

export const adjustmentListItemSchema = z.object({
  id: z.string().uuid(),
  status: adjustmentStatusSchema,
  type: adjustmentTypeSchema,
  notes: z.string().nullable(),
  warehouse_id: z.string().nullable().optional(),
  store_id: z.string().nullable().optional(),
  created_at: z.string(),
  approved_at: z.string().nullable(),
  warehouses: entityRefSchema.optional(),
  stores: entityRefSchema.optional(),
  _count: z.object({ stock_adjustment_items: z.number() }).optional(),
})

export const adjustmentItemRowSchema = z.object({
  id: z.string().uuid(),
  product_variant_id: z.string(),
  location_id: z.string().nullable().optional(),
  qty_before: z.coerce.number(),
  qty_after: z.coerce.number(),
  qty_adjusted: z.coerce.number(),
  unit_cost: z.coerce.number(),
  reason: adjustmentReasonSchema.nullable(),
  batch_id: z.string().nullable().optional(),
  product_variants: z
    .object({ id: z.string(), sku: z.string(), barcode: z.string().nullable().optional() })
    .nullable()
    .optional(),
})

export const adjustmentDetailSchema = adjustmentListItemSchema.extend({
  stock_adjustment_items: z.array(adjustmentItemRowSchema),
})

export type AdjustmentListItem = z.infer<typeof adjustmentListItemSchema>
export type AdjustmentDetail = z.infer<typeof adjustmentDetailSchema>

export const adjustmentListResponseSchema = successEnvelope(
  z.array(adjustmentListItemSchema)
)
export const adjustmentDetailResponseSchema = successEnvelope(
  adjustmentDetailSchema
)

