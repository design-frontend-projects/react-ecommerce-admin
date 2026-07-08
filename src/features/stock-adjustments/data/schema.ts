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
  qty: z.coerce.number(),
  reason: adjustmentReasonSchema.optional(),
  unitCost: z.coerce.number().min(0).optional(),
})

export const createAdjustmentInputSchema = z.object({
  storeId: z.string().uuid('Select a store.'),
  type: adjustmentTypeSchema,
  notes: z.string().optional().nullable(),
  items: z.array(adjustmentItemInputSchema).min(1, 'Add at least one item.'),
})

export type AdjustmentItemInput = z.infer<typeof adjustmentItemInputSchema>
export type CreateAdjustmentInput = z.infer<typeof createAdjustmentInputSchema>

// ── Responses ──
const storeRefSchema = z
  .object({ store_id: z.string(), name: z.string().nullable() })
  .nullable()

export const adjustmentListItemSchema = z.object({
  id: z.string().uuid(),
  status: adjustmentStatusSchema,
  type: adjustmentTypeSchema,
  notes: z.string().nullable(),
  store_id: z.string(),
  created_at: z.string(),
  approved_at: z.string().nullable(),
  stores: storeRefSchema,
  _count: z.object({ stock_adjustment_items: z.number() }).optional(),
})

export const adjustmentItemRowSchema = z.object({
  id: z.string().uuid(),
  product_variant_id: z.string(),
  qty_before: z.coerce.number(),
  qty_after: z.coerce.number(),
  qty_adjusted: z.coerce.number(),
  unit_cost: z.coerce.number(),
  reason: adjustmentReasonSchema.nullable(),
  product_variants: z
    .object({ id: z.string(), sku: z.string() })
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
