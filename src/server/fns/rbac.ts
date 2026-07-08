"use server"

import { supabaseAdmin } from '@/server/supabase-admin'
import prisma from '@/lib/prisma'
import {
  BASE_PERMISSION_DEFINITIONS,
  DEFAULT_ROLE_PERMISSION_NAMES,
  getPrimaryRoleName,
  normalizeRoleName,
  getFallbackPermissionNamesForRoles,
  resolveEffectivePermissions,
} from '@/features/users/data/rbac'
import type {
  CreateRoleInput,
  PermissionRecord,
  RoleWithPermissions,
  ToggleRolePermissionInput,
  UpdateRoleInput,
} from '@/features/users/data/types'

function serializePermission(permission: {
  id: string
  name: string
  description: string | null
  created_at: Date | null
  updated_at: Date | null
}): PermissionRecord {
  return {
    id: permission.id,
    name: permission.name,
    description: permission.description,
    created_at: permission.created_at?.toISOString() ?? null,
    updated_at: permission.updated_at?.toISOString() ?? null,
  }
}

function serializeRole(role: {
  id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: Date | null
  updated_at: Date | null
  role_permissions: Array<{
    permissions: {
      id: string
      name: string
      description: string | null
      created_at: Date | null
      updated_at: Date | null
    }
  }>
}): RoleWithPermissions {
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    is_active: role.is_active,
    created_at: role.created_at?.toISOString() ?? null,
    updated_at: role.updated_at?.toISOString() ?? null,
    permissions: role.role_permissions.map((rolePermission) =>
      serializePermission(rolePermission.permissions)
    ),
  }
}

export async function ensureBasePermissionsSeeded() {
  await Promise.all(
    BASE_PERMISSION_DEFINITIONS.map((permission) =>
      prisma.permissions.upsert({
        where: { name: permission.name },
        update: {
          description: permission.description,
          updated_at: new Date(),
        },
        create: {
          name: permission.name,
          description: permission.description,
        },
      })
    )
  )

  const permissions = (await prisma.permissions.findMany()) as Array<{
    id: string
    name: string
    description: string | null
    created_at: Date | null
    updated_at: Date | null
  }>
  const permissionIdByName = new Map(
    permissions.map((permission) => [permission.name, permission.id])
  )

  for (const [roleName, defaultPermissions] of Object.entries(
    DEFAULT_ROLE_PERMISSION_NAMES
  )) {
    const role = await prisma.roles.upsert({
      where: { name: roleName },
      update: {},
      create: {
        name: roleName,
        description: `${roleName.replace(/_/g, ' ')} role`,
        is_active: true,
      },
      include: {
        role_permissions: true,
      },
    })

    if (role.role_permissions.length > 0) {
      continue
    }

    const permissionIds = defaultPermissions.includes('*')
      ? permissions.map((permission) => permission.id)
      : defaultPermissions
          .map((permissionName) => permissionIdByName.get(permissionName))
          .filter((permissionId): permissionId is string =>
            Boolean(permissionId)
          )

    if (permissionIds.length === 0) {
      continue
    }

    await prisma.role_permissions.createMany({
      data: permissionIds.map((permissionId) => ({
        role_id: role.id,
        permission_id: permissionId,
      })),
      skipDuplicates: true,
    })
  }
}

export async function getRolesWithPermissions(): Promise<
  RoleWithPermissions[]
> {
  await ensureBasePermissionsSeeded()

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

  return roles.map(serializeRole)
}

export async function getAllPermissions(): Promise<PermissionRecord[]> {
  await ensureBasePermissionsSeeded()

  const permissions = await prisma.permissions.findMany({
    orderBy: { name: 'asc' },
  })

  return permissions.map(serializePermission)
}

export async function getRolesPermissions() {
  const [roles, allPermissions] = await Promise.all([
    getRolesWithPermissions(),
    getAllPermissions(),
  ])

  return { roles, allPermissions }
}

export async function checkAdminAccess(callerAuthUserId?: string) {
  if (!callerAuthUserId) return false

  const callerTenantUser = await prisma.tenant_users.findFirst({
    where: { auth_user_id: callerAuthUserId },
    include: {
      user_roles: {
        include: {
          roles: true,
        },
      },
    },
  })

  if (!callerTenantUser) {
    // Authorization reads role assignments only — the legacy profiles.role fallback is removed.
    return false
  }

  const callerRoleNames = (
    callerTenantUser.user_roles as Array<{ roles: { name: string } }>
  ).map((ur) => ur.roles.name.toLowerCase())

  return callerRoleNames.includes('admin') || callerRoleNames.includes('super_admin')
}

export async function createRole(
  input: CreateRoleInput
): Promise<RoleWithPermissions> {
  if (input.callerAuthUserId) {
    const isAdmin = await checkAdminAccess(input.callerAuthUserId)
    if (!isAdmin) throw new Error('Only admin or super_admin users can manage roles')
  }
  const role = await prisma.roles.create({
    data: {
      name: normalizeRoleName(input.name),
      description: input.description,
      is_active: true,
      role_permissions: input.permissionIds?.length
        ? {
            create: input.permissionIds.map((permissionId) => ({
              permission_id: permissionId,
            })),
          }
        : undefined,
    },
    include: {
      role_permissions: {
        include: { permissions: true },
      },
    },
  })

  return serializeRole(role)
}

export async function updateRole(
  input: UpdateRoleInput
): Promise<RoleWithPermissions> {
  if (input.callerAuthUserId) {
    const isAdmin = await checkAdminAccess(input.callerAuthUserId)
    if (!isAdmin) throw new Error('Only admin or super_admin users can manage roles')
  }
  const role = await prisma.roles.update({
    where: { id: input.id },
    data: {
      name: input.name ? normalizeRoleName(input.name) : undefined,
      description: input.description,
      is_active: input.is_active,
      updated_at: new Date(),
    },
    include: {
      role_permissions: {
        include: { permissions: true },
      },
    },
  })

  return serializeRole(role)
}

export async function deleteRole(roleId: string, callerAuthUserId?: string) {
  if (callerAuthUserId) {
    const isAdmin = await checkAdminAccess(callerAuthUserId)
    if (!isAdmin) throw new Error('Only admin or super_admin users can manage roles')
  }

  const role = (await prisma.roles.findUnique({
    where: { id: roleId },
    select: { is_system: true },
  })) as { is_system: boolean } | null
  if (!role) throw new Error('Role not found.')
  if (role.is_system) throw new Error('System roles cannot be deleted.')

  await prisma.roles.delete({
    where: { id: roleId },
  })
}

export async function setRolePermissions(
  roleId: string,
  permissionIds: string[],
  callerAuthUserId?: string
) {
  if (callerAuthUserId) {
    const isAdmin = await checkAdminAccess(callerAuthUserId)
    if (!isAdmin) throw new Error('Only admin or super_admin users can manage roles')
  }
  await prisma.role_permissions.deleteMany({
    where: { role_id: roleId },
  })

  if (permissionIds.length > 0) {
    await prisma.role_permissions.createMany({
      data: permissionIds.map((permissionId) => ({
        role_id: roleId,
        permission_id: permissionId,
      })),
      skipDuplicates: true,
    })
  }

  const role = await prisma.roles.findUniqueOrThrow({
    where: { id: roleId },
    include: {
      role_permissions: {
        include: {
          permissions: true,
        },
      },
    },
  })

  return serializeRole(role)
}

export async function toggleRolePermission(input: ToggleRolePermissionInput) {
  const existing = await prisma.role_permissions.findFirst({
    where: {
      role_id: input.roleId,
      permission_id: input.permissionId,
    },
  })

  if (existing) {
    await prisma.role_permissions.delete({
      where: {
        role_id_permission_id: {
          role_id: input.roleId,
          permission_id: input.permissionId,
        },
      },
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

async function syncClerkUserRoleMetadata(userId: string, roleNames: string[]) {
  if (!userId || userId.startsWith('pending_')) {
    return
  }

  const {
    data: { user },
  } = await supabaseAdmin.auth.admin.getUserById(userId)
  if (!user) return

  const primaryRole = getPrimaryRoleName(roleNames)
  const mergedPermissions = getFallbackPermissionNamesForRoles(roleNames)

  const currentMetadata = user.user_metadata || {}
  await supabaseAdmin.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...currentMetadata,
      role: primaryRole,
      roles: roleNames,
      permissions: mergedPermissions,
    },
  })
}

export async function updateUserRoles(
  userId: string,
  roleIds: string[],
  _assignedBy?: string
) {
  await prisma.user_roles.deleteMany({
    where: { tenant_user_id: userId },
  })

  if (roleIds.length > 0) {
    const tenantUser = await prisma.tenant_users.findUniqueOrThrow({
      where: { id: userId },
    })

    await prisma.user_roles.createMany({
      data: roleIds.map((roleId) => ({
        tenant_user_id: userId,
        role_id: roleId,
      })),
      skipDuplicates: true,
    })

    const roles = (await prisma.roles.findMany({
      where: { id: { in: roleIds } },
      orderBy: { name: 'asc' },
    })) as Array<{
      id: string
      name: string
    }>

    await prisma.tenant_users.update({
      where: { id: userId },
      data: {
        default_role: getPrimaryRoleName(roles.map((role) => role.name)),
        updated_at: new Date(),
      },
    })

    await syncClerkUserRoleMetadata(
      tenantUser.auth_user_id,
      roles.map((role) => role.name)
    )
  }
}

export async function getUserRoles(
  clerkUserId: string
): Promise<RoleWithPermissions[]> {
  const tenantUser = (await prisma.tenant_users.findUnique({
    where: { auth_user_id: clerkUserId },
    include: {
      user_roles: {
        include: {
          roles: {
            include: {
              role_permissions: {
                include: {
                  permissions: true,
                },
              },
            },
          },
        },
      },
    },
  })) as {
    user_roles: Array<{
      roles: {
        id: string
        name: string
        description: string | null
        is_active: boolean
        created_at: Date | null
        updated_at: Date | null
        role_permissions: Array<{
          permissions: {
            id: string
            name: string
            description: string | null
            created_at: Date | null
            updated_at: Date | null
          }
        }>
      }
    }>
  } | null

  if (!tenantUser) {
    return []
  }

  return tenantUser.user_roles.map((assignment) =>
    serializeRole(assignment.roles)
  )
}

const PERMISSION_NAME_PATTERN = /^[a-z0-9_]+\.[a-z0-9_]+$/

export interface CreatePermissionInput {
  name: string
  description?: string | null
}

/** Create a standalone permission (`resource.action`); derives resource/action columns. */
export async function createPermission(
  input: CreatePermissionInput
): Promise<PermissionRecord> {
  const name = input.name.trim().toLowerCase()
  if (!PERMISSION_NAME_PATTERN.test(name)) {
    throw new Error(
      'Permission name must be "resource.action" with lowercase snake_case segments.'
    )
  }

  const existing = await prisma.permissions.findUnique({ where: { name } })
  if (existing) throw new Error(`Permission "${name}" already exists.`)

  const [resource, action] = name.split('.')
  const permission = await prisma.permissions.create({
    data: {
      name,
      description: input.description ?? `${action} on ${resource}`,
      resource,
      action,
    },
  })
  return serializePermission(permission)
}

/**
 * Delete a permission. Blocked when a screen button references it (detach the button
 * first). role_permissions / screen_permissions / user_permissions cascade via FK.
 */
export async function deletePermission(permissionId: string) {
  const references = await prisma.screen_buttons.count({
    where: { permission_id: permissionId },
  })
  if (references > 0) {
    throw new Error(
      'This permission is attached to a screen button. Detach the button before deleting.'
    )
  }

  await prisma.permissions.delete({ where: { id: permissionId } })
  return { success: true }
}

/**
 * Replace a user's per-permission grant/deny overrides (delete-then-createMany within
 * the user's rows). Deny wins over grant, so a permission requested in both is stored
 * only as a deny. Returns the user's resolved effective permission names.
 */
export async function setUserPermissionOverrides(
  tenantUserId: string,
  grantPermissionIds: string[],
  denyPermissionIds: string[]
): Promise<{ effectivePermissionNames: string[] }> {
  const denySet = new Set(denyPermissionIds)
  const grants = grantPermissionIds.filter((id) => !denySet.has(id))

  await prisma.user_permissions.deleteMany({
    where: { tenant_user_id: tenantUserId },
  })

  const rows = [
    ...grants.map((permission_id) => ({
      tenant_user_id: tenantUserId,
      permission_id,
      is_granted: true,
    })),
    ...denyPermissionIds.map((permission_id) => ({
      tenant_user_id: tenantUserId,
      permission_id,
      is_granted: false,
    })),
  ]
  if (rows.length > 0) {
    await prisma.user_permissions.createMany({ data: rows, skipDuplicates: true })
  }

  const tenantUser = (await prisma.tenant_users.findUnique({
    where: { id: tenantUserId },
    include: {
      user_roles: {
        include: {
          roles: { include: { role_permissions: { include: { permissions: true } } } },
        },
      },
      user_permissions: { include: { permissions: true } },
    },
  })) as {
    user_roles: Array<{
      roles: {
        name: string
        role_permissions: Array<{ permissions: { name: string } }>
      }
    }>
    user_permissions: Array<{ is_granted: boolean; permissions: { name: string } }>
  } | null

  if (!tenantUser) return { effectivePermissionNames: [] }

  const roleNames = tenantUser.user_roles.map((assignment) =>
    normalizeRoleName(assignment.roles.name)
  )
  const roleDerived = tenantUser.user_roles.flatMap((assignment) =>
    assignment.roles.role_permissions.map((rp) => rp.permissions.name)
  )
  if (roleNames.some((name) => DEFAULT_ROLE_PERMISSION_NAMES[name]?.includes('*'))) {
    roleDerived.push('*')
  }

  const userGrants = tenantUser.user_permissions
    .filter((override) => override.is_granted)
    .map((override) => override.permissions.name)
  const userDenies = tenantUser.user_permissions
    .filter((override) => !override.is_granted)
    .map((override) => override.permissions.name)

  let allPermissionNames: string[] | undefined
  if (roleDerived.includes('*') && userDenies.length > 0) {
    const all = (await prisma.permissions.findMany({
      select: { name: true },
    })) as Array<{ name: string }>
    allPermissionNames = all.map((permission) => permission.name)
  }

  return {
    effectivePermissionNames: resolveEffectivePermissions(
      roleDerived,
      userGrants,
      userDenies,
      allPermissionNames
    ),
  }
}
