import { z } from 'zod'

const successEnvelope = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({ success: z.literal(true), data: schema })

export const reservationStatusSchema = z.enum([
  'active',
  'consumed',
  'released',
  'expired',
])
export type ReservationStatus = z.infer<typeof reservationStatusSchema>

export const reservationListItemSchema = z.object({
  id: z.string().uuid(),
  store_id: z.string(),
  product_variant_id: z.string(),
  qty: z.coerce.number(),
  qty_consumed: z.coerce.number(),
  status: reservationStatusSchema,
  reference_type: z.string(),
  reference_id: z.string().nullable(),
  reference_item_id: z.string().nullable(),
  expires_at: z.string().nullable(),
  released_at: z.string().nullable(),
  consumed_at: z.string().nullable(),
  created_at: z.string(),
  product_variants: z
    .object({
      id: z.string(),
      sku: z.string(),
      products: z.object({ name: z.string() }).nullable().optional(),
    })
    .nullable()
    .optional(),
  stores: z
    .object({ store_id: z.string(), name: z.string().nullable() })
    .nullable()
    .optional(),
})

export type ReservationListItem = z.infer<typeof reservationListItemSchema>

export const reservationListResponseSchema = successEnvelope(
  z.array(reservationListItemSchema)
)
