import { z } from 'zod'

const successEnvelope = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({ success: z.literal(true), data: schema })

/** Prisma Decimal columns serialize as strings; preserve null while coercing. */
const nullableNumeric = z.preprocess(
  (value) => (value === null || value === undefined ? null : Number(value)),
  z.number().nullable()
)

export const ruleInputSchema = z.object({
  productVariantId: z.string().uuid('Select a product variant.'),
  storeId: z.string().uuid('Select a store.'),
  reorderPoint: z.coerce.number().min(0, 'Reorder point must be >= 0.'),
  minQty: z.coerce.number().optional().nullable(),
  maxQty: z.coerce.number().optional().nullable(),
  safetyStock: z.coerce.number().optional().nullable(),
  reorderQty: z.coerce.number().optional().nullable(),
  eoq: z.coerce.number().optional().nullable(),
  leadTimeDays: z.coerce.number().int().optional().nullable(),
  preferredSupplierId: z.coerce.number().int().optional().nullable(),
  isActive: z.boolean().optional(),
})
export type RuleInput = z.infer<typeof ruleInputSchema>

export const ruleListItemSchema = z.object({
  id: z.string().uuid(),
  reorder_point: z.coerce.number(),
  min_qty: nullableNumeric,
  max_qty: nullableNumeric,
  safety_stock: z.coerce.number(),
  reorder_qty: nullableNumeric,
  eoq: nullableNumeric,
  lead_time_days: z.number().nullable(),
  is_active: z.boolean(),
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
  suppliers: z
    .object({ supplier_id: z.number(), name: z.string() })
    .nullable(),
})
export type RuleListItem = z.infer<typeof ruleListItemSchema>

export const ruleListResponseSchema = successEnvelope(
  z.array(ruleListItemSchema)
)
