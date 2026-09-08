import { z } from 'zod'

export const storeSchema = z.object({
  store_id: z.string().uuid().optional(),
  name: z.string().min(1, 'Store name is required').nullable(),
  phone: z.string().optional().nullable(),
  email: z
    .string()
    .email('Invalid email format')
    .optional()
    .nullable()
    .or(z.literal('')),
  address: z.string().optional().nullable(),
  latitude: z.coerce.number().optional().nullable(),
  longitude: z.coerce.number().optional().nullable(),
  city_id: z.string().uuid().optional().nullable(),
  country_id: z.string().uuid().optional().nullable(),
  status: z.boolean().default(true),
  branch_id: z.string().uuid().optional().nullable(),
  store_type_id: z.string().uuid().optional().nullable(),
  tenant_id: z.string().uuid().optional(),
  created_by_user_id: z.string().uuid().optional().nullable(),
  updated_by_user_id: z.string().uuid().optional().nullable(),
  created_at: z.string().or(z.date()).optional().nullable(),
  updated_at: z.string().or(z.date()).optional().nullable(),
})

export type Store = z.infer<typeof storeSchema>
