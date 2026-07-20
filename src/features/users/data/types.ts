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
  branchId?: string | null
  status: UserStatus
  createdAt: string
  updatedAt: string
}

export interface InviteUserInput {
  email: string
  roleId: string
  /** Multi-role invitation (min 1). Falls back to `roleId`/`roleName` when omitted. */
  roleIds?: string[]
  roleName?: string
  branchId?: string
  redirectUrl?: string
  desc?: string
  /** Supabase access token of the caller; the server derives the inviter from it. */
  sessionToken?: string
  /** @deprecated Derived server-side from `sessionToken`; ignored if provided. */
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
  callerAuthUserId?: string
}

export interface UpdateRoleInput {
  id: string
  name?: string
  description?: string
  is_active?: boolean
  callerAuthUserId?: string
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
  /** tenant_users row id (used to scope per-user realtime override subscriptions). */
  tenantUserId?: string | null
  roleIds: string[]
  roleNames: string[]
  permissionNames: string[]
}
