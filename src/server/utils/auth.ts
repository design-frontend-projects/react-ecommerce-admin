import prisma from '@/lib/prisma'
import { supabaseAdmin } from '@/server/supabase'
import {
  getFallbackPermissionNamesForRoles,
  hasAnyPermission,
  normalizeRoleName,
  extractRoleNames,
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
    where: { user_id: userId },
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

  const roleNames = tenantUser.user_roles.map((assignment) =>
    normalizeRoleName(assignment.roles.name)
  )
  const permissionNames = tenantUser.user_roles.flatMap((assignment) =>
    assignment.roles.role_permissions.map(
      (rolePermission) => rolePermission.permissions.name
    )
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

    // Fallback to roles stored in user_metadata or app_metadata if we want to emulate Clerk publicMetadata
    const appMetadata = user.app_metadata || {}
    const userMetadata = user.user_metadata || {}

    const metadataRoleNames = [
      ...extractRoleNames(appMetadata.roles as unknown),
      ...extractRoleNames(appMetadata.role as unknown),
      ...extractRoleNames(userMetadata.roles as unknown),
      ...extractRoleNames(userMetadata.role as unknown),
    ]

    const { roleNames: dbRoleNames, permissionNames: dbPermissionNames } =
      await getDatabasePermissionNames(userId)

    const roleNames = [...new Set([...dbRoleNames, ...metadataRoleNames])]
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
  return (
    normalizedRoleNames.includes('super_admin') ||
    normalizedRoleNames.includes('admin')
  )
}
