export type UserStatus = 'active' | 'inactive' | 'invited' | 'suspended'

export interface User {
  id: string
  authUserId: string
  firstName: string
  lastName: string
  username: string
  email: string
  phoneNumber: string
  role: string
  roleNames: string[]
  roleIds: string[]
  status: UserStatus
  createdAt: string
  updatedAt: string
}

export interface InviteUserInput {
  email: string
  roleId: string
  roleName?: string
  redirectUrl?: string
  desc?: string
  inviterAuthUserId?: string
}

export interface InviteUserResult {
  success: boolean
  invitationId: string | null
  tenantUserId: string
  mode: 'created' | 'updated' | 'pending-existing'
  message: string
}

export interface PermissionRecord {
  id: string
  name: string
  description?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export interface RoleWithPermissions {
  id: string
  name: string
  description?: string | null
  is_active?: boolean
  created_at?: string | null
  updated_at?: string | null
  permissions: PermissionRecord[]
}

export interface CreateRoleInput {
  name: string
  description?: string
  permissionIds?: string[]
}

export interface UpdateRoleInput {
  id: string
  name?: string
  description?: string
  is_active?: boolean
}

export interface ToggleRolePermissionInput {
  roleId: string
  permissionId: string
}

export interface RBACCatalog {
  roles: RoleWithPermissions[]
  allPermissions: PermissionRecord[]
}

export interface UpdateUserRolesInput {
  userId: string
  roleIds: string[]
}

export interface CompleteOnboardingInput {
  authUserId: string
  firstName: string
  lastName: string
  phone?: string
}

export interface CurrentUserAccess {
  authUserId: string
  roleIds: string[]
  roleNames: string[]
  permissionNames: string[]
}
