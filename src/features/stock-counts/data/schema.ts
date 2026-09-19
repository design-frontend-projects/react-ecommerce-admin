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
  warehouseId: z.string().uuid().optional().nullable(),
  storeId: z.string().uuid().optional().nullable(),
  warehouseLocationId: z.string().uuid().optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  variantIds: z.array(z.string().uuid()).optional().nullable(),
  scopeType: z.enum(['full', 'category', 'variants']).optional(),
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
const entityRefSchema = z
  .object({
    id: z.string().optional(),
    store_id: z.string().optional(),
    name: z.string().nullable(),
    name_ar: z.string().nullable().optional(),
    code: z.string().optional().nullable(),
  })
  .nullable()

export const countListItemSchema = z.object({
  id: z.string(),
  count_number: z.string(),
  status: countStatusSchema,
  warehouse_id: z.string().nullable().optional(),
  store_id: z.string().nullable().optional(),
  warehouse_location_id: z.string().nullable().optional(),
  category_id: z.string().nullable().optional(),
  is_blind: z.boolean().default(false),
  snapshot_at: z.string().nullable().optional(),
  posted_at: z.string().nullable().optional(),
  posted_adjustment_id: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  created_at: z.string(),
  warehouses: entityRefSchema.optional(),
  stores: entityRefSchema.optional(),
  categories: entityRefSchema.optional(),
  _count: z.object({ stock_count_items: z.number() }).optional(),
})

export const countItemRowSchema = z.object({
  id: z.string(),
  product_variant_id: z.string(),
  warehouse_location_id: z.string().nullable().optional(),
  batch_id: z.string().nullable().optional(),
  serial_id: z.string().nullable().optional(),
  qty_snapshot: z.coerce.number(),
  qty_counted: z.coerce.number().nullable().optional(),
  variance: z.coerce.number().nullable().optional(),
  unit_cost: z.coerce.number(),
  counted_at: z.string().nullable().optional(),
  product_variants: z
    .object({
      id: z.string(),
      sku: z.string(),
      name: z.string().nullable().optional(),
      barcode: z.string().nullable().optional(),
      products: z
        .object({
          id: z.string().optional(),
          name: z.string(),
          category_id: z.string().nullable().optional(),
        })
        .nullable()
        .optional(),
    })
    .nullable()
    .optional(),
  warehouse_locations: z
    .object({
      id: z.string(),
      code: z.string().optional(),
      name: z.string().nullable().optional(),
      path: z.string().nullable().optional(),
    })
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

