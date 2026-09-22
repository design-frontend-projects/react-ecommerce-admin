import { z } from 'zod'

const successEnvelope = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({ success: z.literal(true), data: schema })

export const batchStatusSchema = z.enum([
  'active',
  'depleted',
  'expired',
  'blocked',
])
export type BatchStatus = z.infer<typeof batchStatusSchema>

export const batchToggleStatusSchema = z.enum(['active', 'blocked'])
export type BatchToggleStatus = z.infer<typeof batchToggleStatusSchema>

export const batchExpiryUrgencySchema = z.enum([
  'expired',
  'critical',
  'warning',
  'healthy',
  'none',
])
export type BatchExpiryUrgency = z.infer<typeof batchExpiryUrgencySchema>

export const batchLocationSchema = z.object({
  warehouse_id: z.string(),
  warehouse_name: z.string(),
  warehouse_code: z.string().nullable().optional(),
  location_code: z.string(),
  aisle: z.string().nullable().optional(),
  shelf: z.string().nullable().optional(),
  condition: z.string().default('good'),
  qty_on_hand: z.coerce.number(),
  qty_reserved: z.coerce.number().default(0),
})
export type BatchLocation = z.infer<typeof batchLocationSchema>

export const batchListItemSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().optional(),
  product_variant_id: z.string().uuid(),
  batch_number: z.string(),
  manufacture_date: z.string().nullable().optional(),
  expiry_date: z.string().nullable().optional(),
  unit_cost: z.coerce.number().default(0),
  status: batchStatusSchema,
  received_reference_type: z.string().nullable().optional(),
  received_reference_id: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string().optional(),
  supplier_id: z.string().uuid().nullable().optional(),
  created_by_user_id: z.string().nullable().optional(),
  updated_by_user_id: z.string().nullable().optional(),

  // Calculated & Aggregated fields
  qty_on_hand: z.coerce.number().default(0),
  qty_reserved: z.coerce.number().default(0),
  qty_available: z.coerce.number().default(0),
  total_value: z.coerce.number().default(0),
  days_until_expiry: z.number().nullable().optional(),
  expiry_urgency: batchExpiryUrgencySchema.default('none'),

  // Relational details
  product_variants: z
    .object({
      id: z.string(),
      sku: z.string(),
      barcode: z.string().nullable().optional(),
      name: z.string().nullable().optional(),
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
  suppliers: z
    .object({
      id: z.string(),
      name: z.string(),
      code: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  locations: z.array(batchLocationSchema).default([]),
})

export type BatchListItem = z.infer<typeof batchListItemSchema>

export const batchListResponseSchema = successEnvelope(
  z.array(batchListItemSchema)
)

export const singleBatchResponseSchema = successEnvelope(batchListItemSchema)

export const expireSweepResponseSchema = successEnvelope(
  z.object({ expired: z.number() })
)
export type ExpireSweepResult = z.infer<
  typeof expireSweepResponseSchema
>['data']

export const createBatchSchema = z.object({
  product_variant_id: z.string().min(1, 'Product variant is required'),
  batch_number: z.string().min(1, 'Batch number is required'),
  manufacture_date: z.string().nullable().optional(),
  expiry_date: z.string().nullable().optional(),
  unit_cost: z.coerce.number().min(0, 'Unit cost cannot be negative').default(0),
  supplier_id: z.string().nullable().optional(),
  received_reference_type: z.string().nullable().optional(),
  received_reference_id: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  status: z.enum(['active', 'blocked']).default('active'),
})
export type CreateBatchInput = z.infer<typeof createBatchSchema>

export const updateBatchSchema = z.object({
  batch_number: z.string().min(1, 'Batch number is required').optional(),
  manufacture_date: z.string().nullable().optional(),
  expiry_date: z.string().nullable().optional(),
  unit_cost: z.coerce.number().min(0, 'Unit cost cannot be negative').optional(),
  supplier_id: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  status: batchStatusSchema.optional(),
})
export type UpdateBatchInput = z.infer<typeof updateBatchSchema>
