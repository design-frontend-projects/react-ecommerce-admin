import { z } from 'zod'

export const countryFormSchema = z.object({
  name: z.string().min(1, { message: 'Country name is required.' }),
  code: z.string().min(2, { message: 'Country code is required (at least 2 chars).' }),
  phone_code: z.string().optional(),
  is_active: z.boolean().default(true),
})

export type CountryForm = z.infer<typeof countryFormSchema>
