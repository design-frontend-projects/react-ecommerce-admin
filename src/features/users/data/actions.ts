import {
  completeOnboardingInputSchema,
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

export type TokenGetter = () => Promise<string | null>

async function authorizedRequest(
  getToken: TokenGetter,
  input: RequestInfo | URL,
  init?: RequestInit
) {
  const token = await getToken()
  if (!token) {
    throw new Error('Your session is not available. Please sign in again.')
  }

  const headers = new Headers(init?.headers)
  headers.set('Authorization', `Bearer ${token}`)

  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(input, {
    ...init,
    headers,
  })

  const payload = await response
    .json()
    .catch(() => ({ success: false, message: 'Unexpected server response.' }))

  if (!response.ok) {
    throw new Error(
      payload?.message ??
        payload?.error?.message ??
        payload?.error ??
        payload?.details ??
        'Request failed.'
    )
  }

  return payload
}

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
