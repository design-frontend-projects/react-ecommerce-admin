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
  authUserId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  username: z.string(),
  email: z.string().email(),
  phoneNumber: z.string(),
  role: z.string(),
  roleNames: z.array(z.string()),
  roleIds: z.array(z.string()),
  branchId: z.string().nullable().optional(),
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
  branchId: z.string().optional(),
})

export const createUserInputSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  roleId: z.string().min(1, 'Role is required'),
  branchId: z.string().optional(),
})

export const permissionOverrideInputSchema = z.object({
  permissionId: z.string().min(1),
  isGranted: z.boolean(),
})
export type PermissionOverrideInput = z.infer<typeof permissionOverrideInputSchema>

/**
 * Request body for `POST /api/users`. No password field — the server generates a temporary
 * one and returns it once. Supports multiple roles and optional per-user overrides.
 */
export const createUserApiInputSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  firstName: z.string().trim().min(1).optional(),
  lastName: z.string().trim().min(1).optional(),
  phone: z.string().trim().optional(),
  roleIds: z.array(z.string().min(1)).min(1, 'At least one role is required'),
  branchId: z.string().optional(),
  overrides: z.array(permissionOverrideInputSchema).optional(),
})
export type CreateUserApiInput = z.infer<typeof createUserApiInputSchema>

export const createUserResultSchema = z.object({
  tenantUserId: z.string(),
  authUserId: z.string(),
  roleNames: z.array(z.string()),
  primaryRole: z.string().nullable(),
  temporaryPassword: z.string().optional(),
})
export type CreateUserResult = z.infer<typeof createUserResultSchema>

export const createTenantApiInputSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  firstName: z.string().trim().min(1).optional(),
  lastName: z.string().trim().min(1).optional(),
  phone: z.string().trim().optional(),
  redirectTo: z.string().url().optional(),
})
export type CreateTenantApiInput = z.infer<typeof createTenantApiInputSchema>

export const createTenantResultSchema = z.object({
  authUserId: z.string(),
  temporaryPassword: z.string().optional(),
})
export type CreateTenantResult = z.infer<typeof createTenantResultSchema>


export const inviteUserResultSchema = z.object({
  success: z.boolean(),
  invitationId: z.string().nullable(),
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
  authUserId: z.string().min(1),
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  phone: z.string().trim().optional(),
})

export const userPermissionOverridesSchema = z.object({
  grants: z.array(z.string()),
  denies: z.array(z.string()),
})

export type UserPermissionOverrides = z.infer<
  typeof userPermissionOverridesSchema
>

export const setUserPermissionOverridesInputSchema = z.object({
  tenantUserId: z.string().min(1),
  grants: z.array(z.string()),
  denies: z.array(z.string()),
})

const successEnvelope = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({
    success: z.literal(true),
    data: schema,
  })

export const usersResponseSchema = successEnvelope(userListSchema)
export const createUserResponseSchema = successEnvelope(createUserResultSchema)
export const inviteUserResponseSchema = successEnvelope(inviteUserResultSchema)
export const rbacCatalogResponseSchema = successEnvelope(rbacCatalogSchema)
export const roleResponseSchema = successEnvelope(roleSchema)
export const createTenantResponseSchema = successEnvelope(createTenantResultSchema)
export const successResponseSchema = z.object({
  success: z.literal(true),
})
export const userPermissionOverridesResponseSchema = successEnvelope(
  userPermissionOverridesSchema
)
export const effectivePermissionsResponseSchema = successEnvelope(
  z.object({ effectivePermissionNames: z.array(z.string()) })
)

// ─── Onboarding Schemas ─────────────────────────────────────────────────────

export const onboardingBranchInputSchema = z.object({
  name: z.string().trim().min(1, 'Branch name is required'),
  cityId: z.string().min(1, 'City is required'),
  address: z.string().trim().optional(),
  phone: z.string().trim().optional(),
})
export type OnboardingBranchInput = z.infer<typeof onboardingBranchInputSchema>

export const onboardingUserInputSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  firstName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  roleId: z.string().min(1, 'Role is required'),
  branchId: z.string().optional(),
})
export type OnboardingUserInput = z.infer<typeof onboardingUserInputSchema>

export const onboardingBranchesApiSchema = z.object({
  branches: z.array(onboardingBranchInputSchema).min(1, 'At least one branch is required'),
})

export const onboardingUsersApiSchema = z.object({
  users: z.array(onboardingUserInputSchema).min(1, 'At least one user is required'),
})

export const createdOnboardingUserSchema = z.object({
  email: z.string(),
  authUserId: z.string(),
  temporaryPassword: z.string(),
  roleName: z.string(),
  branchId: z.string().nullable(),
  tenantUserId: z.string(),
})

export const onboardingUsersResultSchema = z.object({
  users: z.array(createdOnboardingUserSchema),
  errors: z.array(z.object({ email: z.string(), error: z.string() })),
})

export const createdBranchSchema = z.object({
  id: z.string(),
  name: z.string(),
  cityId: z.string(),
  address: z.string().nullable(),
  phone: z.string().nullable(),
})

export const onboardingBranchesResultSchema = z.array(createdBranchSchema)

export const tenantUserSchema = z.object({
  id: z.string(),
  authUserId: z.string(),
  email: z.string(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  phone: z.string().nullable(),
  role: z.string().nullable(),
  roleNames: z.array(z.string()),
  roleIds: z.array(z.string()),
  branchId: z.string().nullable(),
  branchName: z.string().nullable(),
  isUser: z.boolean(),
  isPaid: z.boolean(),
  isOwner: z.boolean(),
  parentAuthUserId: z.string(),
  createdAt: z.string().nullable(),
})
export type TenantUser = z.infer<typeof tenantUserSchema>
