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
  preferredSupplierId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().optional(),
})
export type RuleInput = z.infer<typeof ruleInputSchema>

export const reorderRulesSortFields = [
  'created_at',
  'reorder_point',
  'safety_stock',
  'min_qty',
  'max_qty',
  'lead_time_days',
  'sku',
] as const

export const reorderRulesSortBySchema = z.enum(reorderRulesSortFields)
export type ReorderRulesSortBy = z.infer<typeof reorderRulesSortBySchema>

export const reorderRulesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional().default(''),
  storeId: z.string().uuid().optional(),
  isActive: z
    .enum(['true', 'false', 'all'])
    .optional()
    .transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
  sortBy: reorderRulesSortBySchema.optional().default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
})
export type ReorderRulesQueryParams = z.infer<typeof reorderRulesQuerySchema>

export const reorderRulesMetricsSchema = z.object({
  totalRules: z.number(),
  activeRules: z.number(),
  inactiveRules: z.number(),
  totalStores: z.number(),
})
export type ReorderRulesMetrics = z.infer<typeof reorderRulesMetricsSchema>

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
      barcode: z.string().nullable().optional(),
      products: z.object({ name: z.string() }).nullable(),
    })
    .nullable(),
  stores: z
    .object({ store_id: z.string(), name: z.string().nullable() })
    .nullable(),
  suppliers: z
    .object({
      id: z.string().optional(),
      supplier_id: z.any().optional(),
      name: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
})
export type RuleListItem = z.infer<typeof ruleListItemSchema>

export const paginatedReorderRulesDataSchema = z.object({
  items: z.array(ruleListItemSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
  metrics: reorderRulesMetricsSchema,
})
export type PaginatedReorderRulesData = z.infer<typeof paginatedReorderRulesDataSchema>

export const paginatedReorderRulesResponseSchema = successEnvelope(
  paginatedReorderRulesDataSchema
)
export type PaginatedReorderRulesResponse = z.infer<
  typeof paginatedReorderRulesResponseSchema
>

export const ruleListResponseSchema = successEnvelope(
  z.array(ruleListItemSchema)
)

export interface VariantSearchResult {
  id: string
  sku: string
  barcode?: string | null
  name?: string | null
  product_name?: string
  price?: number
  cost_price?: number | null
}

export interface VariantSearchResponse {
  success: boolean
  items: VariantSearchResult[]
}
