import { z } from 'zod'

const successEnvelope = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({ success: z.literal(true), data: schema })

export const requisitionStatusSchema = z.enum([
  'draft',
  'submitted',
  'approved',
  'rejected',
  'converted',
  'cancelled',
])
export type RequisitionStatus = z.infer<typeof requisitionStatusSchema>

export const requisitionActionSchema = z.enum([
  'submit',
  'approve',
  'reject',
  'convert',
])
export type RequisitionAction = z.infer<typeof requisitionActionSchema>

// ── Inputs ──
export const requisitionItemInputSchema = z.object({
  productVariantId: z.string().uuid('Select a variant.'),
  qtyRequested: z.coerce.number().positive('Quantity must be > 0.'),
  preferredSupplierId: z.coerce.number().int().positive().optional().nullable(),
  estUnitCost: z.coerce
    .number()
    .min(0, 'Estimated cost cannot be negative.')
    .optional(),
  reason: z.string().optional().nullable(),
})

export const createRequisitionInputSchema = z.object({
  storeId: z.string().uuid().optional().nullable(),
  neededBy: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(requisitionItemInputSchema).min(1, 'Add at least one item.'),
})

export type RequisitionItemInput = z.infer<typeof requisitionItemInputSchema>
export type CreateRequisitionInput = z.infer<
  typeof createRequisitionInputSchema
>

// ── Responses ──
const storeRefSchema = z
  .object({ store_id: z.string(), name: z.string().nullable() })
  .nullable()

const supplierRefSchema = z
  .object({ supplier_id: z.number(), name: z.string().nullable() })
  .nullable()

export const requisitionListItemSchema = z.object({
  id: z.string().uuid(),
  requisition_number: z.string(),
  status: requisitionStatusSchema,
  source: z.string(),
  needed_by: z.string().nullable(),
  notes: z.string().nullable(),
  created_at: z.string(),
  stores: storeRefSchema,
  _count: z.object({ purchase_requisition_items: z.number() }).optional(),
})

export const requisitionItemRowSchema = z.object({
  id: z.string().uuid(),
  qty_requested: z.coerce.number(),
  est_unit_cost: z.coerce.number(),
  reason: z.string().nullable(),
  product_variants: z
    .object({
      id: z.string(),
      sku: z.string(),
      products: z.object({ name: z.string() }).nullable(),
    })
    .nullable(),
  suppliers: supplierRefSchema,
})

export const requisitionDetailSchema = requisitionListItemSchema.extend({
  purchase_requisition_items: z.array(requisitionItemRowSchema),
})

export type RequisitionListItem = z.infer<typeof requisitionListItemSchema>
export type RequisitionItemRow = z.infer<typeof requisitionItemRowSchema>
export type RequisitionDetail = z.infer<typeof requisitionDetailSchema>

export const requisitionListResponseSchema = successEnvelope(
  z.array(requisitionListItemSchema)
)
export const requisitionDetailResponseSchema = successEnvelope(
  requisitionDetailSchema
)
