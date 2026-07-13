import { z } from 'zod'

const successEnvelope = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({ success: z.literal(true), data: schema })

export const stockByLocationRowSchema = z.object({
  id: z.string().uuid(),
  store_id: z.string(),
  qty_on_hand: z.coerce.number(),
  qty_reserved: z.coerce.number(),
  last_movement_at: z.string().nullable(),
  product_variants: z
    .object({
      id: z.string(),
      sku: z.string(),
      products: z.object({ name: z.string() }).nullable(),
    })
    .nullable(),
  warehouses: z
    .object({ id: z.string(), code: z.string(), name: z.string() })
    .nullable(),
  warehouse_locations: z
    .object({
      id: z.string(),
      code: z.string(),
      path: z.string().nullable(),
      location_type: z.enum(['zone', 'rack', 'shelf', 'bin']),
    })
    .nullable(),
  stores: z
    .object({ store_id: z.string(), name: z.string().nullable() })
    .nullable(),
  product_batches: z
    .object({
      id: z.string(),
      batch_number: z.string(),
      expiry_date: z.string().nullable(),
    })
    .nullable(),
})
export type StockByLocationRow = z.infer<typeof stockByLocationRowSchema>

export const reconcileReportSchema = z.object({
  clean: z.boolean(),
  balance_vs_location: z.array(z.unknown()),
  variant_cache: z.array(z.unknown()),
  qty_available: z.array(z.unknown()),
  serial_counts: z.array(z.unknown()),
})
export type ReconcileReport = z.infer<typeof reconcileReportSchema>

export const stockByLocationResponseSchema = successEnvelope(
  z.array(stockByLocationRowSchema)
)
export const reconcileResponseSchema = successEnvelope(reconcileReportSchema)
