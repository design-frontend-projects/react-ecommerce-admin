/**
 * Shared types for User Management feature.
 * These types are environment-agnostic and can be safely imported 
 * in both client and server contexts.
 */

export interface User {
  id: string
  firstName: string
  lastName: string
  username: string
  email: string
  phoneNumber: string
  role: string
  createdAt: string
  updatedAt: string
}

export interface InviteUserInput {
  email: string
  roleId: string
  roleName: string
  desc?: string
  clerk_user_id?: string
}

export interface InviteUserResult {
  success: boolean
  clerkInvitationId: string
  tenantUserId: string
}

export interface Permission {
  id: string
  name: string
  description?: string | null
}

export interface PermissionRecord extends Permission {
  created_at?: string | null
  updated_at?: string | null
}

export interface Role {
  id: string
  name: string
  description?: string | null
  is_active?: boolean
  created_at?: string | null
  updated_at?: string | null
  permissions: Permission[]
}

export interface RoleWithPermissions extends Role {}

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
