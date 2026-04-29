import { verifyToken } from '@clerk/backend'
import { clerkBackend } from '@/server/clerk'
import prisma from '@/lib/prisma'
import {
  extractRoleNames,
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

async function getDatabasePermissionNames(clerkUserId: string) {
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
    const verifiedToken = await verifyToken(sessionToken, {
      secretKey: process.env.CLERK_SECRET_KEY,
    })
    const userId = verifiedToken.sub

    if (!userId) {
      throw new Error('Unauthorized: Invalid session token')
    }

    const user = await clerkBackend.users.getUser(userId)
    const publicMetadata = user.publicMetadata as Record<string, unknown>
    const metadataRoleNames = [
      ...extractRoleNames(publicMetadata.roles),
      ...extractRoleNames(publicMetadata.role),
    ]

    const { roleNames: dbRoleNames, permissionNames: dbPermissionNames } =
      await getDatabasePermissionNames(userId)

    const roleNames = [...new Set([...metadataRoleNames, ...dbRoleNames])]
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
