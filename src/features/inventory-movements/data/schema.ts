import { z } from 'zod'

const successEnvelope = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({ success: z.literal(true), data: schema })

export const movementRowSchema = z.object({
  id: z.string().uuid(),
  movement_type: z.string(),
  reference_type: z.string().nullable(),
  reference_id: z.string().nullable(),
  qty_in: z.coerce.number(),
  qty_out: z.coerce.number(),
  unit_cost: z.coerce.number(),
  total_cost: z.coerce.number(),
  movement_date: z.string(),
  remarks: z.string().nullable(),
  store_id: z.string().nullable(),
  product_variant_id: z.string(),
  product_variants: z
    .object({ id: z.string(), sku: z.string() })
    .nullable()
    .optional(),
  stores: z
    .object({ store_id: z.string(), name: z.string().nullable() })
    .nullable()
    .optional(),
  branches: z
    .object({ id: z.string(), name: z.string().nullable() })
    .nullable()
    .optional(),
})

export type MovementRow = z.infer<typeof movementRowSchema>

export const movementsResponseSchema = successEnvelope(
  z.array(movementRowSchema)
)

export interface MovementFilters {
  movementType?: string
  storeId?: string
  productVariantId?: string
  referenceType?: string
  dateFrom?: string
  dateTo?: string
  limit?: number
}
