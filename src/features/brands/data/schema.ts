import { z } from 'zod'

const successEnvelope = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({ success: z.literal(true), data: schema })

export const brandInputSchema = z.object({
  name: z.string().min(1, 'Name is required.').max(120),
  code: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
})
export type BrandInput = z.infer<typeof brandInputSchema>

export const brandListItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  code: z.string().nullable(),
  logo_url: z.string().nullable(),
  description: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.string(),
  _count: z.object({ products: z.number() }).optional(),
})
export type BrandListItem = z.infer<typeof brandListItemSchema>

export const brandListResponseSchema = successEnvelope(
  z.array(brandListItemSchema)
)
