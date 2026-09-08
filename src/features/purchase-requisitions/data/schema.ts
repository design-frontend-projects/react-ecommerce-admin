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
  productVariantId: z.string().min(1, 'Select a variant.'),
  qtyRequested: z.coerce.number().positive('Quantity must be > 0.'),
  uomId: z.string().uuid().optional().nullable(),
  preferredSupplierId: z.string().uuid().optional().nullable(),
  estUnitCost: z.coerce
    .number()
    .min(0, 'Estimated cost cannot be negative.')
    .optional()
    .default(0),
  reason: z.string().optional().nullable(),
})

export const createRequisitionInputSchema = z.object({
  storeId: z.string().uuid().optional().nullable(),
  currency: z.string().min(1).max(3).optional().nullable().default('USD'),
  neededBy: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(requisitionItemInputSchema).min(1, 'Add at least one item.'),
})

export const updateRequisitionInputSchema = createRequisitionInputSchema

export type RequisitionItemInput = z.infer<typeof requisitionItemInputSchema>
export type CreateRequisitionInput = z.infer<typeof createRequisitionInputSchema>
export type UpdateRequisitionInput = z.infer<typeof updateRequisitionInputSchema>

// ── Responses ──
const storeRefSchema = z
  .object({ store_id: z.string(), name: z.string().nullable() })
  .nullable()

const supplierRefSchema = z
  .object({
    id: z.string(),
    name: z.string().nullable(),
  })
  .nullable()

const uomRefSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    code: z.string().nullable().optional(),
  })
  .nullable()

export const requisitionListItemSchema = z.object({
  id: z.string().uuid(),
  requisition_number: z.string(),
  status: requisitionStatusSchema,
  source: z.string(),
  currency: z.string().nullable().optional().default('USD'),
  needed_by: z.string().nullable(),
  notes: z.string().nullable(),
  created_at: z.string(),
  total_amount: z.coerce.number().optional().default(0),
  store_id: z.string().uuid().nullable().optional(),
  stores: storeRefSchema.optional(),
  _count: z.object({ purchase_requisition_items: z.number() }).optional(),
})

export const requisitionItemRowSchema = z.object({
  id: z.string().uuid(),
  product_variant_id: z.string().optional().nullable(),
  qty_requested: z.coerce.number(),
  est_unit_cost: z.coerce.number(),
  uom_id: z.string().uuid().optional().nullable(),
  reason: z.string().nullable(),
  product_variants: z
    .object({
      id: z.string(),
      sku: z.string(),
      product_id: z.string().optional().nullable(),
      dimensions: z.any().optional().nullable(),
      products: z
        .object({
          id: z.string().optional(),
          name: z.string(),
          sku: z.string().optional().nullable(),
        })
        .nullable()
        .optional(),
    })
    .nullable()
    .optional(),
  suppliers: supplierRefSchema.optional(),
  uoms: uomRefSchema.optional(),
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
