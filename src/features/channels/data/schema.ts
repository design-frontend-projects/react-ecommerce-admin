import { z } from 'zod'

export const channelFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, { message: 'Code must be at least 2 characters.' })
    .max(50, { message: 'Code must be at most 50 characters.' })
    .regex(/^[A-Za-z0-9_-]+$/, {
      message: 'Code can only contain letters, numbers, hyphens, and underscores.',
    }),
  name: z
    .string()
    .trim()
    .min(2, { message: 'Name must be at least 2 characters.' })
    .max(150, { message: 'Name must be at most 150 characters.' }),
  name_ar: z
    .string()
    .trim()
    .max(150, { message: 'Arabic name must be at most 150 characters.' })
    .optional()
    .nullable()
    .or(z.literal('')),
  description: z
    .string()
    .trim()
    .max(500, { message: 'Description must be at most 500 characters.' })
    .optional()
    .nullable()
    .or(z.literal('')),
  is_active: z.boolean().default(true),
})

export type ChannelFormData = z.infer<typeof channelFormSchema>

export interface Channel {
  id: string
  tenant_id: string
  code: string
  name: string
  name_ar?: string | null
  description?: string | null
  is_active: boolean
  created_at?: string
  updated_at?: string
  created_by_user_id?: string | null
  updated_by_user_id?: string | null
}

export interface ChannelInput {
  code: string
  name: string
  name_ar?: string | null
  description?: string | null
  is_active?: boolean
}
