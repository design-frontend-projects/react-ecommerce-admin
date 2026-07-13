import { z } from 'zod'

const successEnvelope = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({ success: z.literal(true), data: schema })

export const serialStatusSchema = z.enum([
  'in_stock',
  'reserved',
  'sold',
  'returned',
  'damaged',
  'in_transit',
  'written_off',
])
export type SerialStatus = z.infer<typeof serialStatusSchema>

export const SERIAL_STATUSES = serialStatusSchema.options

export const serialListItemSchema = z.object({
  id: z.string().uuid(),
  serial_number: z.string(),
  status: serialStatusSchema,
  received_at: z.string().nullable(),
  sold_at: z.string().nullable(),
  created_at: z.string(),
  product_variants: z
    .object({
      id: z.string(),
      sku: z.string(),
      products: z.object({ name: z.string() }).nullable(),
    })
    .nullable(),
  stores: z
    .object({ store_id: z.string(), name: z.string().nullable() })
    .nullable(),
  product_batches: z
    .object({ id: z.string(), batch_number: z.string() })
    .nullable(),
})
export type SerialListItem = z.infer<typeof serialListItemSchema>

export const serialTrailEntrySchema = z.object({
  id: z.string().uuid(),
  inventory_movements: z.object({
    id: z.string(),
    movement_type: z.string(),
    movement_date: z.string(),
    qty_in: z.coerce.number(),
    qty_out: z.coerce.number(),
    reference_type: z.string().nullable(),
    reference_id: z.string().nullable(),
    remarks: z.string().nullable(),
  }),
})
export type SerialTrailEntry = z.infer<typeof serialTrailEntrySchema>

export const serialListResponseSchema = successEnvelope(
  z.array(serialListItemSchema)
)
export const serialTrailResponseSchema = successEnvelope(
  z.array(serialTrailEntrySchema)
)

export interface SerialFilters {
  search?: string
  status?: SerialStatus
}
