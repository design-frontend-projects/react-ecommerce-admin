import { z } from 'zod'

export const userStatusSchema = z.enum([
  'active',
  'inactive',
  'invited',
  'suspended',
])
export type UserStatus = z.infer<typeof userStatusSchema>

export const permissionRecordSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
})
export type Permission = z.infer<typeof permissionRecordSchema>

export const roleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
  permissions: z.array(permissionRecordSchema),
})
export type Role = z.infer<typeof roleSchema>

export const userSchema = z.object({
  id: z.string(),
  clerkUserId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  username: z.string(),
  email: z.string().email(),
  phoneNumber: z.string(),
  role: z.string(),
  roleNames: z.array(z.string()),
  roleIds: z.array(z.string()),
  status: userStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type User = z.infer<typeof userSchema>

export const userListSchema = z.array(userSchema)

export const inviteUserInputSchema = z.object({
  email: z.string().email(),
  roleId: z.string().min(1),
  roleName: z.string().optional(),
})

export const inviteUserResultSchema = z.object({
  success: z.boolean(),
  clerkInvitationId: z.string().nullable(),
  tenantUserId: z.string(),
  mode: z.enum(['created', 'updated', 'pending-existing']),
  message: z.string(),
})

export const rbacCatalogSchema = z.object({
  roles: z.array(roleSchema),
  allPermissions: z.array(permissionRecordSchema),
})

export const updateUserRolesInputSchema = z.object({
  userId: z.string().min(1),
  roleIds: z.array(z.string()),
})

export const createRoleInputSchema = z.object({
  name: z.string().trim().min(2),
  description: z.string().trim().optional(),
  permissionIds: z.array(z.string()).optional(),
})

export const updateRoleInputSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(2).optional(),
  description: z.string().trim().optional(),
  is_active: z.boolean().optional(),
})

export const setRolePermissionsInputSchema = z.object({
  roleId: z.string().min(1),
  permissionIds: z.array(z.string()),
})

export const completeOnboardingInputSchema = z.object({
  clerkId: z.string().min(1),
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  phone: z.string().trim().optional(),
})

const successEnvelope = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({
    success: z.literal(true),
    data: schema,
  })

export const usersResponseSchema = successEnvelope(userListSchema)
export const inviteUserResponseSchema = successEnvelope(inviteUserResultSchema)
export const rbacCatalogResponseSchema = successEnvelope(rbacCatalogSchema)
export const roleResponseSchema = successEnvelope(roleSchema)
export const successResponseSchema = z.object({
  success: z.literal(true),
})
