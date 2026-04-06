import { z } from "zod";

export const storeSchema = z.object({
  store_id: z.string().uuid().optional(),
  name: z.string().min(1, "Store name is required").nullable(),
  clerk_user_id: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email("Invalid email format").optional().nullable().or(z.literal("")),
  address: z.string().optional().nullable(),
  latitude: z.coerce.number().optional().nullable(),
  longitude: z.coerce.number().optional().nullable(),
  city_id: z.string().uuid().optional().nullable(),
  country_id: z.string().uuid().optional().nullable(),
  status: z.boolean().default(true),
  branch_id: z.string().uuid().optional().nullable(),
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
});

export type Store = z.infer<typeof storeSchema>;
