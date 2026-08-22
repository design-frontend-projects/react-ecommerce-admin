import { z } from 'zod'

export const lookupTypeItemSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  is_system: z.boolean(),
  is_active: z.boolean(),
  sort_order: z.number(),
  values_count: z.number(),
  custom_count: z.number(),
  system_count: z.number(),
})

export type LookupTypeItem = z.infer<typeof lookupTypeItemSchema>

export const lookupValueItemSchema = z.object({
  id: z.string(),
  lookup_type_id: z.string(),
  tenant_id: z.string().nullable().optional(),
  code: z.string(),
  name: z.string(),
  name_ar: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.any()).nullable().optional(),
  is_default: z.boolean(),
  is_system: z.boolean(),
  is_active: z.boolean(),
  is_tenant_custom: z.boolean(),
  sort_order: z.number(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

export type LookupValueItem = z.infer<typeof lookupValueItemSchema>

export const lookupTypeListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(lookupTypeItemSchema),
})

export const lookupValueListResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    lookupType: z.object({
      id: z.string(),
      code: z.string(),
      name: z.string(),
      description: z.string().nullable().optional(),
      is_system: z.boolean(),
    }),
    values: z.array(lookupValueItemSchema),
  }),
})

export const lookupValueFormSchema = z.object({
  code: z
    .string()
    .min(1, 'Code is required.')
    .max(50, 'Code max 50 characters.')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Code can only contain letters, numbers, hyphens, and underscores.'),
  name: z.string().min(1, 'Display name is required.').max(150, 'Name max 150 characters.'),
  nameAr: z.string().max(150, 'Arabic name max 150 characters.').optional().nullable(),
  description: z.string().max(500, 'Description max 500 characters.').optional().nullable(),
  color: z.string().max(20).optional().nullable(),
  icon: z.string().max(50).optional().nullable(),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
})

export type LookupValueFormValues = z.infer<typeof lookupValueFormSchema>
