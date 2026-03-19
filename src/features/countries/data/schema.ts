import { z } from 'zod'

export const countrySchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  status: z.enum(['active', 'inactive']),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
})

export type Country = z.infer<typeof countrySchema>

export const countryListSchema = z.array(countrySchema)
