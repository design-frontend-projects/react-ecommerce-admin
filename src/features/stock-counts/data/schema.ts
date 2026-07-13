import { z } from 'zod'

const successEnvelope = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({ success: z.literal(true), data: schema })

export const countStatusSchema = z.enum([
  'draft',
  'counting',
  'review',
  'posted',
  'cancelled',
])
export type CountStatus = z.infer<typeof countStatusSchema>

export const countActionSchema = z.enum(['snapshot', 'review', 'post', 'save'])
export type CountAction = z.infer<typeof countActionSchema>

// ── Inputs ──
export const createCountInputSchema = z.object({
  storeId: z.string().uuid('Select a store.'),
  warehouseLocationId: z.string().uuid().optional().nullable(),
  categoryId: z.coerce.number().int().optional().nullable(),
  isBlind: z.boolean().optional(),
  notes: z.string().optional().nullable(),
})
export type CreateCountInput = z.infer<typeof createCountInputSchema>

export const countEntryInputSchema = z.object({
  itemId: z.string().uuid(),
  qtyCounted: z.coerce.number().min(0, 'Counted quantity cannot be negative.'),
})
export type CountEntryInput = z.infer<typeof countEntryInputSchema>

// ── Responses ──
const storeRefSchema = z
  .object({ store_id: z.string(), name: z.string().nullable() })
  .nullable()

export const countListItemSchema = z.object({
  id: z.string().uuid(),
  count_number: z.string(),
  status: countStatusSchema,
  store_id: z.string(),
  warehouse_location_id: z.string().nullable(),
  category_id: z.number().nullable(),
  is_blind: z.boolean(),
  snapshot_at: z.string().nullable(),
  posted_at: z.string().nullable(),
  posted_adjustment_id: z.string().nullable(),
  notes: z.string().nullable(),
  created_at: z.string(),
  stores: storeRefSchema,
  _count: z.object({ stock_count_items: z.number() }).optional(),
})

export const countItemRowSchema = z.object({
  id: z.string().uuid(),
  product_variant_id: z.string(),
  warehouse_location_id: z.string().nullable(),
  qty_snapshot: z.coerce.number(),
  qty_counted: z.coerce.number().nullable(),
  variance: z.coerce.number().nullable(),
  unit_cost: z.coerce.number(),
  counted_at: z.string().nullable(),
  product_variants: z
    .object({
      id: z.string(),
      sku: z.string(),
      products: z.object({ name: z.string() }).nullable().optional(),
    })
    .nullable()
    .optional(),
  warehouse_locations: z
    .object({ id: z.string(), path: z.string().nullable() })
    .nullable()
    .optional(),
})

export const countDetailSchema = countListItemSchema.extend({
  stock_count_items: z.array(countItemRowSchema),
})

export type CountListItem = z.infer<typeof countListItemSchema>
export type CountItemRow = z.infer<typeof countItemRowSchema>
export type CountDetail = z.infer<typeof countDetailSchema>

export const countListResponseSchema = successEnvelope(
  z.array(countListItemSchema)
)
export const countDetailResponseSchema = successEnvelope(countDetailSchema)
