import { supabaseAdmin } from '@/server/supabase'
import { supabase } from '@/lib/supabase'
import { ADMIN_ROLES, UserRole } from '@/types/user-role.enum'
import prisma from '@/lib/prisma'
import {
  DEFAULT_ROLE_PERMISSION_NAMES,
  hasAnyPermission,
  normalizeRoleName,
  resolveEffectivePermissions,
} from '@/features/users/data/rbac'

export interface AuthorizedUser {
  userId: string
  primaryRole: string | null
  roleNames: string[]
  permissionNames: string[]
}

export function getBearerToken(request: Request) {
  const authorization = request.headers.get('authorization')

  if (!authorization?.startsWith('Bearer ')) {
    throw new Error('Unauthorized: Missing bearer token')
  }

  const token = authorization.slice('Bearer '.length).trim()
  if (!token) {
    throw new Error('Unauthorized: Missing bearer token')
  }

  return token
}

async function getDatabasePermissionNames(userId: string) {
  const tenantUser = (await prisma.tenant_users.findUnique({
    where: { auth_user_id: userId },
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
      user_permissions: {
        include: {
          permissions: true,
        },
      },
    },
  })) as {
    user_roles: Array<{
      roles: {
        name: string
        role_permissions: Array<{
          permissions: {
            name: string
          }
        }>
      }
    }>
    user_permissions: Array<{
      is_granted: boolean
      permissions: {
        name: string
      }
    }>
  } | null

  if (!tenantUser) {
    return {
      roleNames: [] as string[],
      permissionNames: [] as string[],
    }
  }

  const roleNames = tenantUser.user_roles.map((assignment) =>
    normalizeRoleName(assignment.roles.name)
  )

  const roleDerivedNames = tenantUser.user_roles.flatMap((assignment) =>
    assignment.roles.role_permissions.map(
      (rolePermission) => rolePermission.permissions.name
    )
  )

  // Honour wildcard roles (e.g. super_admin) for permissions not concretely linked
  // (like dynamically created button permissions).
  const hasWildcardRole = roleNames.some((roleName) =>
    DEFAULT_ROLE_PERMISSION_NAMES[roleName]?.includes('*')
  )
  if (hasWildcardRole) {
    roleDerivedNames.push('*')
  }

  const userGrants = tenantUser.user_permissions
    .filter((override) => override.is_granted)
    .map((override) => override.permissions.name)
  const userDenies = tenantUser.user_permissions
    .filter((override) => !override.is_granted)
    .map((override) => override.permissions.name)

  // When a wildcard holder has explicit denies, expand the wildcard against the full
  // permission universe so the specific denies can be carved out precisely.
  let allPermissionNames: string[] | undefined
  if (hasWildcardRole && userDenies.length > 0) {
    const all = (await prisma.permissions.findMany({
      select: { name: true },
    })) as Array<{ name: string }>
    allPermissionNames = all.map((permission) => permission.name)
  }

  const permissionNames = resolveEffectivePermissions(
    roleDerivedNames,
    userGrants,
    userDenies,
    allPermissionNames
  )

  return {
    roleNames,
    permissionNames,
  }
}

export async function requireAuth(
  sessionToken: string,
  requiredPermissions?: string | string[]
): Promise<AuthorizedUser> {
  try {
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(sessionToken)

    if (error || !user) {
      throw new Error('Unauthorized: Invalid session token')
    }

    const userId = user.id

    const { roleNames: dbRoleNames, permissionNames: dbPermissionNames } =
      await getDatabasePermissionNames(userId)

    const roleNames = [...new Set([...dbRoleNames])]
    const permissionNames = [...new Set([...dbPermissionNames])]

    const requiredList = Array.isArray(requiredPermissions)
      ? requiredPermissions
      : requiredPermissions
        ? [requiredPermissions]
        : []

    if (
      requiredList.length > 0 &&
      !hasAnyPermission(permissionNames, requiredList)
    ) {
      throw new Error('Forbidden: Insufficient permissions')
    }

    return {
      userId,
      primaryRole: roleNames[0] ?? null,
      roleNames,
      permissionNames,
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }

    throw new Error('Unauthorized: Authentication failed')
  }
}

export function hasAdminAccess(roleNames: string[]) {
  const normalizedRoleNames = roleNames.map(normalizeRoleName)
  return ADMIN_ROLES.some((role) => normalizedRoleNames.includes(role))
}

export async function isSuperAdmin(userId?: string): Promise<boolean> {
  let id = userId
  if (!id) {
    const { data: { user } } = await supabase.auth.getUser()
    id = user?.id
  }

  if (!id) return false

  const profile = await prisma.profiles.findFirst({
    where: { auth_user_id: id },
    select: { role: true },
  })

  return profile?.role === UserRole.SuperAdmin
}

export async function isAdmin(userId?: string): Promise<boolean> {
  let id = userId
  if (!id) {
    const { data: { user } } = await supabase.auth.getUser()
    id = user?.id
  }

  if (!id) return false

  const profile = await prisma.profiles.findFirst({
    where: { auth_user_id: id },
    select: { role: true },
  })

  return profile?.role === UserRole.Admin || profile?.role === UserRole.SuperAdmin
}
