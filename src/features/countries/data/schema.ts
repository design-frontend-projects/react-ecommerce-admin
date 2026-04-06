import { z } from 'zod'

export const countrySchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  phone_code: z.string().optional(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
})

export type Country = z.infer<typeof countrySchema>

export const countryListSchema = z.array(countrySchema)
