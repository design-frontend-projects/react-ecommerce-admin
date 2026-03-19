import { z } from 'zod'

export const cityFormSchema = z.object({
  name: z.string().min(1, { message: 'City name is required.' }),
  countryId: z.string().min(1, { message: 'Country is required.' }),
  status: z.string().min(1, { message: 'Status is required.' }),
  isEdit: z.boolean(),
})

export type CityForm = z.infer<typeof cityFormSchema>
