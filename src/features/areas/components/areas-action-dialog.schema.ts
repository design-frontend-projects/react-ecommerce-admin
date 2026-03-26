import { z } from 'zod'

export const areaFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  city_id: z.number().min(1, 'City is required'),
  is_active: z.boolean().default(true),
})

export type AreaForm = z.infer<typeof areaFormSchema>
