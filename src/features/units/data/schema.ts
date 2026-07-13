import { z } from 'zod'

const successEnvelope = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({ success: z.literal(true), data: schema })

export const uomCategorySchema = z.enum([
  'count',
  'weight',
  'volume',
  'length',
  'time',
])
export type UomCategory = z.infer<typeof uomCategorySchema>

export const uomInputSchema = z.object({
  code: z.string().min(1, 'Code is required.').max(30),
  name: z.string().min(1, 'Name is required.').max(120),
  uomCategory: uomCategorySchema,
  isBase: z.boolean().optional(),
  isActive: z.boolean().optional(),
})
export type UomInput = z.infer<typeof uomInputSchema>

export const conversionInputSchema = z.object({
  fromUomId: z.string().uuid('Select a from unit.'),
  toUomId: z.string().uuid('Select a to unit.'),
  factor: z
    .number({ message: 'Factor must be a number.' })
    .positive('Factor must be greater than zero.'),
  productVariantId: z.string().uuid().optional().nullable(),
})
export type ConversionInput = z.infer<typeof conversionInputSchema>

export const uomListItemSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  uom_category: uomCategorySchema,
  is_base: z.boolean(),
  is_active: z.boolean(),
  created_at: z.string(),
  _count: z
    .object({ conversions_from: z.number(), conversions_to: z.number() })
    .optional(),
})
export type UomListItem = z.infer<typeof uomListItemSchema>

export const conversionListItemSchema = z.object({
  id: z.string().uuid(),
  factor: z.coerce.number(),
  from_uom: z.object({ id: z.string(), code: z.string() }),
  to_uom: z.object({ id: z.string(), code: z.string() }),
  product_variants: z
    .object({ id: z.string(), sku: z.string().nullable() })
    .nullable(),
})
export type ConversionListItem = z.infer<typeof conversionListItemSchema>

export const uomListResponseSchema = successEnvelope(
  z.array(uomListItemSchema)
)
export const conversionListResponseSchema = successEnvelope(
  z.array(conversionListItemSchema)
)
