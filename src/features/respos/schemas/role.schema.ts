import { z } from 'zod'
import { UserRole } from '@/types/user-role.enum'

const PERMISSIONS = [
  'dashboard',
  'pos',
  'orders',
  'menu',
  'floors',
  'reservations',
  'reservations_view',
  'analytics',
  'shifts',
  'settings',
  'payments',
  'void_approve',
  'void_request',
  'kitchen',
  'notifications',
  '*',
] as const

export const roleFormSchema = z.object({
  name: z.nativeEnum(UserRole, {
    message: 'Role name is required',
  }),
  display_name: z.string().min(2, 'Display name must be at least 2 characters'),
  permissions: z
    .array(z.enum(PERMISSIONS))
    .min(1, 'At least one permission is required'),
})

export type RoleFormValues = z.infer<typeof roleFormSchema>

export { PERMISSIONS }
