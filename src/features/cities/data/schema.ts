import { z } from 'zod'

export const citySchema = z.object({
  id: z.number(),
  name: z.string(),
  country_id: z.number(),
  is_active: z.boolean(),
  created_at: z.string(),
  countries: z
    .object({
      name: z.string(),
    })
    .optional(),
})

export type City = z.infer<typeof citySchema>

export const cityListSchema = z.array(citySchema)
