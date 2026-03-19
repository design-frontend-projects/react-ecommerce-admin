import { z } from 'zod'

export const citySchema = z.object({
  id: z.string(),
  name: z.string(),
  countryId: z.string(),
  status: z.enum(['active', 'inactive', 'pending']),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  state: z.string().optional(),
  population: z.number().optional(),
})

export type City = z.infer<typeof citySchema>

export const cityListSchema = z.array(citySchema)
