import { z } from 'zod'

export const areaSchema = z.object({
  id: z.number(),
  name: z.string(),
  city_id: z.number(),
  is_active: z.boolean(),
  created_at: z.string(),
  cities: z
    .object({
      name: z.string(),
      countries: z.object({
        name: z.string(),
      }).optional(),
    })
    .optional(),
})

export type Area = z.infer<typeof areaSchema>

export const areaListSchema = z.array(areaSchema)
