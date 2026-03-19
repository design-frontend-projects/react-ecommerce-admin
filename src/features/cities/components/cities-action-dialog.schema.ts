import { z } from 'zod'

export const cityFormSchema = z.object({
  name: z.string().min(1, { message: 'City name is required.' }),
  country_id: z.coerce.number().min(1, { message: 'Country is required.' }),
  is_active: z.boolean().default(true),
})

export type CityForm = z.infer<typeof cityFormSchema>
