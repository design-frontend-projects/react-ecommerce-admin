import prisma from '@/lib/prisma'
import { supabaseAdmin } from '@/server/supabase'
import {
  getFallbackPermissionNamesForRoles,
  hasAnyPermission,
  normalizeRoleName,
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

async function getDatabasePermissionNames(authUserId: string) {
  const tenantUser = (await prisma.tenant_users.findUnique({
    where: { auth_user_id: authUserId },
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
        name: string
        role_permissions: Array<{
          permissions: {
            name: string
          }
        }>
      }
    }>
  } | null

  if (!tenantUser) {
    return {
      roleNames: [] as string[],
      permissionNames: [] as string[],
    }
  }

  const roleNames = tenantUser.user_roles.map((assignment) => normalizeRoleName(assignment.roles.name))
  const permissionNames = tenantUser.user_roles.flatMap((assignment) =>
    assignment.roles.role_permissions.map((rolePermission) => rolePermission.permissions.name)
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
    const { data, error } = await supabaseAdmin.auth.getUser(sessionToken)
    if (error) {
      throw new Error('Unauthorized: Invalid session token')
    }

    const userId = data.user?.id

    if (!userId) {
      throw new Error('Unauthorized: Invalid session token')
    }

    const { roleNames: dbRoleNames, permissionNames: dbPermissionNames } =
      await getDatabasePermissionNames(userId)

    const roleNames = [...new Set(dbRoleNames)]
    const permissionNames = [
      ...new Set([
        ...dbPermissionNames,
        ...getFallbackPermissionNamesForRoles(roleNames),
      ]),
    ]

    const requiredList = Array.isArray(requiredPermissions)
      ? requiredPermissions
      : requiredPermissions
        ? [requiredPermissions]
        : []

    if (requiredList.length > 0 && !hasAnyPermission(permissionNames, requiredList)) {
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
  return normalizedRoleNames.includes('super_admin') || normalizedRoleNames.includes('admin')
}
