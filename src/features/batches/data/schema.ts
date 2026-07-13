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

export const batchListItemSchema = z.object({
  id: z.string().uuid(),
  batch_number: z.string(),
  manufacture_date: z.string().nullable(),
  expiry_date: z.string().nullable(),
  unit_cost: z.coerce.number(),
  qty_on_hand: z.coerce.number(),
  status: batchStatusSchema,
  notes: z.string().nullable(),
  created_at: z.string(),
  product_variants: z
    .object({
      id: z.string(),
      sku: z.string(),
      products: z.object({ name: z.string() }).nullable(),
    })
    .nullable(),
  suppliers: z
    .object({ supplier_id: z.number(), name: z.string() })
    .nullable(),
})
export type BatchListItem = z.infer<typeof batchListItemSchema>

export const batchListResponseSchema = successEnvelope(
  z.array(batchListItemSchema)
)

export const expireSweepResponseSchema = successEnvelope(
  z.object({ expired: z.number() })
)
export type ExpireSweepResult = z.infer<
  typeof expireSweepResponseSchema
>['data']
