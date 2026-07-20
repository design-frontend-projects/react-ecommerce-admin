import {
  completeOnboardingInputSchema,
  createUserApiInputSchema,
  createUserResponseSchema,
  inviteUserInputSchema,
  inviteUserResponseSchema,
  rbacCatalogResponseSchema,
  roleResponseSchema,
  successResponseSchema,
  updateRoleInputSchema,
  updateUserRolesInputSchema,
  usersResponseSchema,
  createRoleInputSchema,
  setRolePermissionsInputSchema,
  setUserPermissionOverridesInputSchema,
  userPermissionOverridesResponseSchema,
  effectivePermissionsResponseSchema,
  type UserPermissionOverrides,
  type CreateUserApiInput,
  type CreateUserResult,
} from './schema'
import type {
  CompleteOnboardingInput,
  CreateRoleInput,
  InviteUserInput,
  InviteUserResult,
  RBACCatalog,
  RoleWithPermissions,
  UpdateRoleInput,
  UpdateUserRolesInput,
  User,
} from './types'

import { authorizedRequest, type TokenGetter } from '@/lib/api-client'

export type { TokenGetter }

export async function fetchUsers(getToken: TokenGetter): Promise<User[]> {
  const payload = await authorizedRequest(getToken, '/api/users')
  return usersResponseSchema.parse(payload).data
}

export async function fetchRBACCatalog(
  getToken: TokenGetter
): Promise<RBACCatalog> {
  const payload = await authorizedRequest(getToken, '/api/rbac')
  return rbacCatalogResponseSchema.parse(payload).data
}

export async function createUser(
  getToken: TokenGetter,
  input: CreateUserApiInput
): Promise<CreateUserResult> {
  const body = createUserApiInputSchema.parse(input)
  const payload = await authorizedRequest(getToken, '/api/users', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return createUserResponseSchema.parse(payload).data
}

export async function inviteUser(
  getToken: TokenGetter,
  input: InviteUserInput
): Promise<InviteUserResult> {
  const body = inviteUserInputSchema.parse(input)
  const payload = await authorizedRequest(getToken, '/api/users/invite', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return inviteUserResponseSchema.parse(payload).data
}

export async function updateUserRoles(
  getToken: TokenGetter,
  input: UpdateUserRolesInput
) {
  const body = updateUserRolesInputSchema.parse(input)
  const payload = await authorizedRequest(getToken, '/api/users/roles', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return successResponseSchema.parse(payload)
}

export async function createRole(
  getToken: TokenGetter,
  input: CreateRoleInput
): Promise<RoleWithPermissions> {
  const body = createRoleInputSchema.parse(input)
  const payload = await authorizedRequest(getToken, '/api/rbac', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return roleResponseSchema.parse(payload).data
}

export async function updateRole(
  getToken: TokenGetter,
  input: UpdateRoleInput
): Promise<RoleWithPermissions> {
  const body = updateRoleInputSchema.parse(input)
  const payload = await authorizedRequest(getToken, '/api/rbac', {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
  return roleResponseSchema.parse(payload).data
}

export async function deleteRole(getToken: TokenGetter, roleId: string) {
  const payload = await authorizedRequest(
    getToken,
    `/api/rbac?id=${encodeURIComponent(roleId)}`,
    {
      method: 'DELETE',
    }
  )
  return successResponseSchema.parse(payload)
}

export async function setRolePermissions(
  getToken: TokenGetter,
  input: { roleId: string; permissionIds: string[] }
): Promise<RoleWithPermissions> {
  const body = setRolePermissionsInputSchema.parse(input)
  const payload = await authorizedRequest(getToken, '/api/rbac/permissions', {
    method: 'PUT',
    body: JSON.stringify(body),
  })
  return roleResponseSchema.parse(payload).data
}

export async function fetchUserPermissionOverrides(
  getToken: TokenGetter,
  tenantUserId: string
): Promise<UserPermissionOverrides> {
  const payload = await authorizedRequest(
    getToken,
    `/api/users/permissions?tenantUserId=${encodeURIComponent(tenantUserId)}`
  )
  return userPermissionOverridesResponseSchema.parse(payload).data
}

export async function setUserPermissionOverrides(
  getToken: TokenGetter,
  input: { tenantUserId: string; grants: string[]; denies: string[] }
): Promise<string[]> {
  const body = setUserPermissionOverridesInputSchema.parse(input)
  const payload = await authorizedRequest(getToken, '/api/users/permissions', {
    method: 'PUT',
    body: JSON.stringify(body),
  })
  return effectivePermissionsResponseSchema.parse(payload).data
    .effectivePermissionNames
}

export async function completeOnboarding(
  getToken: TokenGetter,
  input: CompleteOnboardingInput
) {
  const body = completeOnboardingInputSchema.parse(input)
  const payload = await authorizedRequest(getToken, '/api/users/onboarding', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return successResponseSchema.parse(payload)
}
