export interface PermissionRecord {
  id: string
  name: string
  description: string | null
  created_at: string | null
  updated_at: string | null
}

export interface RoleWithPermissions {
  id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string | null
  updated_at: string | null
  permissions: Pick<PermissionRecord, 'id' | 'name' | 'description'>[]
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
