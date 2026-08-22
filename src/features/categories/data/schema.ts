import { z } from 'zod'

const successEnvelope = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({ success: z.literal(true), data: schema })

export const categoryInputSchema = z.object({
  name: z.string().min(1, 'Name is required.').max(100),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
})
export type CategoryInput = z.infer<typeof categoryInputSchema>

export const categoryListItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable().optional(),
  is_active: z.boolean().nullable().optional(),
  created_at: z.string().nullable().optional(),
  _count: z.object({ products: z.number() }).optional(),
})
export type CategoryListItem = z.infer<typeof categoryListItemSchema>
export type Category = CategoryListItem

export const categoryListResponseSchema = successEnvelope(
  z.array(categoryListItemSchema)
)
