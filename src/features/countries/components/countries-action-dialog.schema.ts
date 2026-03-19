import { z } from 'zod'

export const countryFormSchema = z.object({
  name: z.string().min(1, { message: 'Country name is required.' }),
  code: z.string().min(2, { message: 'Country code is required.' }),
  status: z.string().min(1, { message: 'Status is required.' }),
})

export type CountryForm = z.infer<typeof countryFormSchema>
