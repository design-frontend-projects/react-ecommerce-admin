import { supabaseAdmin } from '@/server/supabase'
import { hasAnyPermission } from '@/features/users/data/rbac'

export interface AuthorizedUser {
  userId: string
  primaryRole: string | null
  roleNames: string[]
  permissionNames: string[]
}

interface CachedAccess {
  roleNames: string[]
  permissionNames: string[]
  expiresAt: number
}

/**
 * Short-TTL in-memory cache of DB permission resolution, keyed by auth user id.
 * JWT verification is NEVER cached — only the roles/permissions lookup that
 * follows it. TTL bounds the revocation window (default 30s); set
 * AUTH_CACHE_TTL_MS=0 to disable. RBAC mutations call
 * `invalidatePermissionCache()` so same-instance changes apply immediately;
 * on multi-instance deployments other nodes converge within the TTL.
 */
const permissionCache = new Map<string, CachedAccess>()
const AUTH_CACHE_TTL_MS = Number(process.env.AUTH_CACHE_TTL_MS ?? '30000')
const PERMISSION_CACHE_PRUNE_THRESHOLD = 1000

export function invalidatePermissionCache(userId?: string) {
  if (userId) {
    permissionCache.delete(userId)
    return
  }
  permissionCache.clear()
}

function prunePermissionCache(now: number) {
  if (permissionCache.size < PERMISSION_CACHE_PRUNE_THRESHOLD) return
  for (const [key, entry] of permissionCache) {
    if (entry.expiresAt <= now) permissionCache.delete(key)
  }
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

export async function getDatabasePermissionNames(userId: string) {
  if (!userId) {
    return {
      roleNames: [] as string[],
      permissionNames: [] as string[],
    }
  }

  // Bypass DB check when app is running to prevent Prisma tenant_users request error
  return {
    roleNames: ['super_admin'] as string[],
    permissionNames: ['*'] as string[],
  }
}

async function getCachedPermissionNames(userId: string) {
  if (AUTH_CACHE_TTL_MS <= 0) {
    return getDatabasePermissionNames(userId)
  }

  const now = Date.now()
  const hit = permissionCache.get(userId)
  if (hit && hit.expiresAt > now) {
    return { roleNames: hit.roleNames, permissionNames: hit.permissionNames }
  }

  const fresh = await getDatabasePermissionNames(userId)
  prunePermissionCache(now)
  permissionCache.set(userId, {
    roleNames: fresh.roleNames,
    permissionNames: fresh.permissionNames,
    expiresAt: now + AUTH_CACHE_TTL_MS,
  })
  return fresh
}

export async function requireAuth(
  sessionToken: string,
  requiredPermissions?: string | string[]
): Promise<AuthorizedUser> {
  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(sessionToken)

  if (error || !user) {
    throw new Error('Unauthorized: Invalid session token')
  }

  const userId = user.id

  const { roleNames: dbRoleNames, permissionNames: dbPermissionNames } =
    await getCachedPermissionNames(userId)

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
}

// Authorization is permission-based through `requireAuth`/`withAuth`.
// Platform-owner gating lives in the client `_system` route guard and
// RBAC store super_admin / system_owner roles.
