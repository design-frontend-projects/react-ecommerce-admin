import prisma from '@/lib/prisma'
import { clerkBackend } from '@/server/clerk'
import {
  BASE_PERMISSION_DEFINITIONS,
  DEFAULT_ROLE_PERMISSION_NAMES,
  getFallbackPermissionNamesForRoles,
  getPrimaryRoleName,
  normalizeRoleName,
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
  const permissionIdByName = new Map(permissions.map((permission) => [permission.name, permission.id]))

  for (const [roleName, defaultPermissions] of Object.entries(DEFAULT_ROLE_PERMISSION_NAMES)) {
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

    const permissionIds = (
      defaultPermissions.includes('*')
        ? permissions.map((permission) => permission.id)
        : defaultPermissions
            .map((permissionName) => permissionIdByName.get(permissionName))
            .filter((permissionId): permissionId is string => Boolean(permissionId))
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

export async function getRolesWithPermissions(): Promise<RoleWithPermissions[]> {
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

export async function createRole(input: CreateRoleInput): Promise<RoleWithPermissions> {
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

export async function updateRole(input: UpdateRoleInput): Promise<RoleWithPermissions> {
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

export async function deleteRole(roleId: string) {
  await prisma.roles.delete({
    where: { id: roleId },
  })
}

export async function setRolePermissions(roleId: string, permissionIds: string[]) {
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

async function syncClerkUserRoleMetadata(clerkUserId: string, roleNames: string[]) {
  if (!clerkUserId || clerkUserId.startsWith('pending_')) {
    return
  }

  const user = await clerkBackend.users.getUser(clerkUserId)
  const primaryRole = getPrimaryRoleName(roleNames)
  const mergedPermissions = getFallbackPermissionNamesForRoles(roleNames)

  await clerkBackend.users.updateUserMetadata(clerkUserId, {
    publicMetadata: {
      ...(user.publicMetadata as Record<string, unknown>),
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
    where: { user_id: userId },
  })

  if (roleIds.length > 0) {
    const tenantUser = await prisma.tenant_users.findUniqueOrThrow({
      where: { id: userId },
    })

    await prisma.user_roles.createMany({
      data: roleIds.map((roleId) => ({
        user_id: userId,
        role_id: roleId,
        clerk_user_id: tenantUser.clerk_user_id,
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

    await syncClerkUserRoleMetadata(tenantUser.clerk_user_id, roles.map((role) => role.name))
  }
}

export async function getUserRoles(clerkUserId: string): Promise<RoleWithPermissions[]> {
  const tenantUser = (await prisma.tenant_users.findUnique({
    where: { clerk_user_id: clerkUserId },
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

  return tenantUser.user_roles.map((assignment) => serializeRole(assignment.roles))
}
