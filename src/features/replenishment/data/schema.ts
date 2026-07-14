import { z } from 'zod'

const successEnvelope = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({ success: z.literal(true), data: schema })

export const suggestionStatusSchema = z.enum([
  'open',
  'converted',
  'dismissed',
  'expired',
])
export type SuggestionStatus = z.infer<typeof suggestionStatusSchema>

export const suggestionListItemSchema = z.object({
  id: z.string().uuid(),
  status: suggestionStatusSchema,
  qty_available_at_run: z.coerce.number(),
  qty_on_order_at_run: z.coerce.number(),
  suggested_qty: z.coerce.number(),
  converted_requisition_id: z.string().nullable(),
  run_at: z.string(),
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
  suppliers: z.object({ supplier_id: z.number(), name: z.string() }).nullable(),
})
export type SuggestionListItem = z.infer<typeof suggestionListItemSchema>

export const suggestionListResponseSchema = successEnvelope(
  z.array(suggestionListItemSchema)
)

export const runCheckResponseSchema = successEnvelope(
  z.object({ suggestions_open: z.number() })
)
export type RunCheckResult = z.infer<typeof runCheckResponseSchema>['data']

export const convertResponseSchema = successEnvelope(
  z.object({
    requisition_id: z.string(),
    suggestions_converted: z.number(),
  })
)
export type ConvertResult = z.infer<typeof convertResponseSchema>['data']
