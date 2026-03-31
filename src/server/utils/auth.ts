import { clerkBackend } from '@/server/clerk'

/**
 * Validates that the user is authenticated and has the required permission.
 * Returns the Clerk user ID if authorized, throws otherwise.
 */
export async function requireAuth(
  sessionToken: string,
  requiredPermission?: string
): Promise<{ userId: string; role: string }> {
  try {
    const { sub: userId } = await clerkBackend.verifyToken(sessionToken)

    if (!userId) {
      throw new Error('Unauthorized: Invalid session token')
    }

    const user = await clerkBackend.users.getUser(userId)
    const role = (user.publicMetadata as { role?: string })?.role ?? ''

    if (requiredPermission) {
      const allowedRoles = ['super_admin', 'admin']
      if (!allowedRoles.includes(role)) {
        throw new Error(
          `Forbidden: Role "${role}" does not have permission "${requiredPermission}"`
        )
      }
    }

    return { userId, role }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Unauthorized: Authentication failed')
  }
}

/**
 * Simple permission check based on Clerk public metadata role.
 * For admin-level operations, ensures user has admin or super_admin role.
 */
export function hasAdminAccess(role: string): boolean {
  return ['super_admin', 'admin'].includes(role)
}
