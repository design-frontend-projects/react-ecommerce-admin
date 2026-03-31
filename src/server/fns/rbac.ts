import prisma from '@/lib/prisma'

import type {
  RoleWithPermissions,
  PermissionRecord,
  CreateRoleInput,
  UpdateRoleInput,
  ToggleRolePermissionInput,
} from './rbac.types'

// ─── Queries ───────────────────────────────────────────────────────────────────

/**
 * Retrieves all roles with their associated permissions.
 */
export async function getRolesWithPermissions(): Promise<RoleWithPermissions[]> {
  const roles = await prisma.roles.findMany({
    include: {
      role_permissions: {
        include: {
          permissions: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  })

  return roles.map((role) => ({
    id: role.id,
    name: role.name,
    description: role.description,
    is_active: role.is_active,
    created_at: role.created_at?.toISOString() ?? null,
    updated_at: role.updated_at?.toISOString() ?? null,
    permissions: role.role_permissions.map((rp) => ({
      id: rp.permissions.id,
      name: rp.permissions.name,
      description: rp.permissions.description,
    })),
  }))
}

/**
 * Retrieves all system permissions.
 */
export async function getAllPermissions(): Promise<PermissionRecord[]> {
  const permissions = await prisma.permissions.findMany({
    orderBy: { name: 'asc' },
  })

  return permissions.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    created_at: p.created_at?.toISOString() ?? null,
    updated_at: p.updated_at?.toISOString() ?? null,
  }))
}

/**
 * Get roles and permissions combined endpoint.
 */
export async function getRolesPermissions() {
  const [roles, allPermissions] = await Promise.all([
    getRolesWithPermissions(),
    getAllPermissions(),
  ])

  return { roles, allPermissions }
}

// ─── Mutations ─────────────────────────────────────────────────────────────────

/**
 * Creates a new role with optional permissions.
 */
export async function createRole(input: CreateRoleInput): Promise<RoleWithPermissions> {
  const role = await prisma.roles.create({
    data: {
      name: input.name,
      description: input.description,
      is_active: true,
      ...(input.permissionIds?.length
        ? {
            role_permissions: {
              create: input.permissionIds.map((permissionId) => ({
                permission_id: permissionId,
              })),
            },
          }
        : {}),
    },
    include: {
      role_permissions: {
        include: { permissions: true },
      },
    },
  })

  return {
    id: role.id,
    name: role.name,
    description: role.description,
    is_active: role.is_active,
    created_at: role.created_at?.toISOString() ?? null,
    updated_at: role.updated_at?.toISOString() ?? null,
    permissions: role.role_permissions.map((rp) => ({
      id: rp.permissions.id,
      name: rp.permissions.name,
      description: rp.permissions.description,
    })),
  }
}

/**
 * Updates an existing role.
 */
export async function updateRole(input: UpdateRoleInput): Promise<RoleWithPermissions> {
  const role = await prisma.roles.update({
    where: { id: input.id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.is_active !== undefined ? { is_active: input.is_active } : {}),
      updated_at: new Date(),
    },
    include: {
      role_permissions: {
        include: { permissions: true },
      },
    },
  })

  return {
    id: role.id,
    name: role.name,
    description: role.description,
    is_active: role.is_active,
    created_at: role.created_at?.toISOString() ?? null,
    updated_at: role.updated_at?.toISOString() ?? null,
    permissions: role.role_permissions.map((rp) => ({
      id: rp.permissions.id,
      name: rp.permissions.name,
      description: rp.permissions.description,
    })),
  }
}

/**
 * Deletes a role by ID.
 */
export async function deleteRole(roleId: string): Promise<void> {
  await prisma.roles.delete({ where: { id: roleId } })
}

/**
 * Toggles a permission on a role (add if missing, remove if exists).
 */
export async function toggleRolePermission(
  input: ToggleRolePermissionInput
): Promise<{ added: boolean }> {
  const existing = await prisma.role_permissions.findFirst({
    where: {
      role_id: input.roleId,
      permission_id: input.permissionId,
    },
  })

  if (existing) {
    await prisma.role_permissions.delete({
      where: { role_id_permission_id: { role_id: input.roleId, permission_id: input.permissionId } },
    })
    return { added: false }
  }

  await prisma.role_permissions.create({
    data: {
      role_id: input.roleId,
      permission_id: input.permissionId,
    },
  })
  return { added: true }
}

/**
 * Updates roles assigned to a user (clerk_user_id) using the employee_roles table.
 */
export async function updateUserRoles(
  clerkUserId: string,
  roleIds: string[],
  assignedBy?: string
): Promise<void> {
  // Delete existing assignments
  await prisma.employee_roles.deleteMany({
    where: { clerk_user_id: clerkUserId },
  })

  // Create new assignments
  if (roleIds.length > 0) {
    await prisma.employee_roles.createMany({
      data: roleIds.map((roleId) => ({
        clerk_user_id: clerkUserId,
        role_id: roleId,
        assigned_by: assignedBy,
      })),
    })
  }
}

/**
 * Get roles assigned to a specific user.
 */
export async function getUserRoles(clerkUserId: string): Promise<RoleWithPermissions[]> {
  const assignments = await prisma.employee_roles.findMany({
    where: { clerk_user_id: clerkUserId },
    include: {
      roles: {
        include: {
          role_permissions: {
            include: { permissions: true },
          },
        },
      },
    },
  })

  return assignments.map((a) => ({
    id: a.roles.id,
    name: a.roles.name,
    description: a.roles.description,
    is_active: a.roles.is_active,
    created_at: a.roles.created_at?.toISOString() ?? null,
    updated_at: a.roles.updated_at?.toISOString() ?? null,
    permissions: a.roles.role_permissions.map((rp) => ({
      id: rp.permissions.id,
      name: rp.permissions.name,
      description: rp.permissions.description,
    })),
  }))
}
