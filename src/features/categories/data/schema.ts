import { z } from 'zod'

const successEnvelope = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({ success: z.literal(true), data: schema })

export const categoryInputSchema = z.object({
  name: z.string().min(1, 'Name is required.').max(100),
  name_ar: z.string().max(150, 'Arabic name must be at most 150 characters.').optional().nullable(),
  nameAr: z.string().max(150, 'Arabic name must be at most 150 characters.').optional().nullable(),
  parent_id: z.string().uuid().optional().nullable(),
  parentId: z.string().uuid().optional().nullable(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  is_active: z.boolean().optional(),
})
export type CategoryInput = z.infer<typeof categoryInputSchema>

export const categoryParentSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  name_ar: z.string().nullable().optional(),
})
export type CategoryParent = z.infer<typeof categoryParentSchema>

export const categoryListItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  name_ar: z.string().nullable().optional(),
  parent_id: z.string().nullable().optional(),
  parent: categoryParentSchema.nullable().optional(),
  description: z.string().nullable().optional(),
  is_active: z.boolean().nullable().optional(),
  created_at: z.string().nullable().optional(),
  _count: z
    .object({
      products: z.number(),
      children: z.number().optional(),
    })
    .optional(),
})
export type CategoryListItem = z.infer<typeof categoryListItemSchema>
export type Category = CategoryListItem

export const categoryListResponseSchema = successEnvelope(
  z.array(categoryListItemSchema)
)
