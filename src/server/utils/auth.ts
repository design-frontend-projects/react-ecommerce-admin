import { supabaseAdmin } from '@/server/supabase'
import prisma from '@/lib/prisma'
import {
  hasAnyPermission,
  resolveEffectivePermissions,
} from '@/features/users/data/rbac'
import { resolveTenantId } from '@/server/utils/tenant'
import { getOptionalTenantContext } from '@/server/context/tenant-context'

export interface AuthorizedUser {
  userId: string
  primaryRole: string | null
  roleNames: string[]
  permissionNames: string[]
  tenantId?: string | null
  tenantUserId?: string | null
  branchId?: string | null
  warehouseId?: string | null
}

export interface DatabasePermissionsResult {
  roleNames: string[]
  roleIds: string[]
  permissionNames: string[]
  tenantUserId: string | null
  tenantId?: string | null
  branchId: string | null
  warehouseId: string | null
  isBlocked: boolean
}

interface CachedAccess extends DatabasePermissionsResult {
  expiresAt: number
}

/**
 * Short-TTL in-memory cache of DB permission resolution, keyed by `${tenantId}:${authUserId}`.
 * JWT verification is NEVER cached — only the roles/permissions lookup that
 * follows it. TTL bounds the revocation window (default 30s); set
 * AUTH_CACHE_TTL_MS=0 to disable. RBAC mutations call
 * `invalidatePermissionCache({ authUserId, tenantId })` so same-instance changes apply immediately;
 * on multi-instance deployments other nodes converge within the TTL.
 */
const permissionCache = new Map<string, CachedAccess>()
const AUTH_CACHE_TTL_MS = Number(process.env.AUTH_CACHE_TTL_MS ?? '30000')
const PERMISSION_CACHE_PRUNE_THRESHOLD = 1000
const AUTH_CACHE_MAX_ENTRIES = Math.max(
  100,
  Number(process.env.AUTH_CACHE_MAX_ENTRIES ?? '5000')
)

export interface InvalidateCacheOptions {
  authUserId?: string
  userId?: string
  tenantId?: string
}

/**
 * Invalidate cached permission entries.
 * - Call with no arguments to invalidate the entire cache.
 * - Call with a string (userId) to invalidate all tenant entries for that user.
 * - Call with `{ authUserId, tenantId }` to invalidate a specific compound key.
 * - Call with `{ tenantId }` to invalidate all user entries for a specific tenant.
 */
export function invalidatePermissionCache(
  target?: string | InvalidateCacheOptions
): void {
  if (!target) {
    permissionCache.clear()
    return
  }

  const authUserId =
    typeof target === 'string' ? target : (target.authUserId ?? target.userId)
  const tenantId = typeof target === 'string' ? undefined : target.tenantId

  if (!authUserId && !tenantId) {
    permissionCache.clear()
    return
  }

  for (const key of permissionCache.keys()) {
    const colonIndex = key.indexOf(':')
    const kTenantId = colonIndex !== -1 ? key.slice(0, colonIndex) : ''
    const kUserId = colonIndex !== -1 ? key.slice(colonIndex + 1) : key

    const matchUser = authUserId ? kUserId === authUserId : true
    const matchTenant = tenantId ? kTenantId === tenantId : true

    if (matchUser && matchTenant) {
      permissionCache.delete(key)
    }
  }
}

function prunePermissionCache(now: number): void {
  // 1. Opportunistic TTL sweep when prune threshold is reached
  if (permissionCache.size >= PERMISSION_CACHE_PRUNE_THRESHOLD) {
    for (const [key, entry] of permissionCache) {
      if (entry.expiresAt <= now) {
        permissionCache.delete(key)
      }
    }
  }

  // 2. Strict LRU capacity bounding: evict least recently used entries
  while (permissionCache.size >= AUTH_CACHE_MAX_ENTRIES) {
    const oldestKey = permissionCache.keys().next().value
    if (oldestKey !== undefined) {
      permissionCache.delete(oldestKey)
    } else {
      break
    }
  }
}

export function getBearerToken(request: Request): string {
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

/**
 * Authoritative database permission resolver.
 * 1. Queries `tenant_users` by `auth_user_id` and active `tenant_id`.
 * 2. Checks `is_active` and `is_blocked`.
 * 3. Aggregates active roles from `user_roles` matching tenant scope.
 * 4. Aggregates role permissions from `role_permissions`.
 * 5. Aggregates direct user permissions from `user_permissions` (grants vs explicit denies).
 * 6. Applies deterministic precedence via `resolveEffectivePermissions`:
 *    Explicit Deny > Explicit Grant > Role Permissions > Wildcard (*).
 * 7. Enforces Default DENY: if inactive, blocked, or missing roles/permissions -> empty permissions, isBlocked: true.
 */
export async function getDatabasePermissionNames(
  authUserId: string,
  tenantId?: string
): Promise<DatabasePermissionsResult> {
  if (!authUserId) {
    return {
      roleNames: [],
      roleIds: [],
      permissionNames: [],
      tenantUserId: null,
      tenantId: null,
      branchId: null,
      warehouseId: null,
      isBlocked: false,
    }
  }

  // Resolve active tenantId if not explicitly provided
  const effectiveTenantId =
    tenantId ??
    getOptionalTenantContext()?.tenantId ??
    (await resolveTenantId(authUserId)) ??
    undefined

  // 1. Resolve tenant_user record within the active tenant
  const tenantUser = await prisma.tenant_users.findFirst({
    where: {
      auth_user_id: authUserId,
      ...(effectiveTenantId
        ? {
            OR: [
              { tenant_id: effectiveTenantId },
              { parent_tenant_id: effectiveTenantId },
            ],
          }
        : {}),
      deleted_at: null,
    },
    select: {
      id: true,
      tenant_id: true,
      branch_id: true,
      warehouse_id: true,
      is_active: true,
      is_blocked: true,
      default_role: true,
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
  })

  // Default DENY: If tenant user does not exist, or is inactive/blocked
  if (!tenantUser || tenantUser.is_active === false || tenantUser.is_blocked === true) {
    return {
      roleNames: [],
      roleIds: [],
      permissionNames: [],
      tenantUserId: tenantUser?.id ?? null,
      tenantId: tenantUser?.tenant_id ?? effectiveTenantId ?? null,
      branchId: tenantUser?.branch_id ?? null,
      warehouseId: tenantUser?.warehouse_id ?? null,
      isBlocked: true,
    }
  }

  // 2. Multi-Role Aggregation: Collect active roles matching tenant scope or global system roles
  let activeRoles = tenantUser.user_roles
    .map((ur) => ur.roles)
    .filter((r): r is NonNullable<typeof r> => {
      if (!r || !r.is_active) return false
      return (
        r.tenant_id === null ||
        r.tenant_id === tenantUser.tenant_id ||
        (effectiveTenantId ? r.tenant_id === effectiveTenantId : false)
      )
    })

  // Fallback to default_role if user_roles has no matches
  if (activeRoles.length === 0 && tenantUser.default_role) {
    const fallbackRole = await prisma.roles.findFirst({
      where: {
        name: tenantUser.default_role,
        is_active: true,
        OR: [
          { tenant_id: null },
          { tenant_id: tenantUser.tenant_id },
          ...(effectiveTenantId ? [{ tenant_id: effectiveTenantId }] : []),
        ],
      },
      include: {
        role_permissions: {
          include: {
            permissions: true,
          },
        },
      },
    })
    if (fallbackRole) {
      activeRoles = [fallbackRole]
    }
  }

  const roleNames = [...new Set(activeRoles.map((r) => r.name))]
  const roleIds = [...new Set(activeRoles.map((r) => r.id))]

  // 3. Aggregate role permissions
  const rolePermissionNames = new Set<string>()
  for (const role of activeRoles) {
    for (const rp of role.role_permissions) {
      if (rp.permissions?.name) {
        rolePermissionNames.add(rp.permissions.name)
      }
    }
  }

  // 4. Collect direct user permissions (grants vs explicit denies)
  const userGrants: string[] = []
  const userDenies: string[] = []
  for (const up of tenantUser.user_permissions) {
    if (up.permissions?.name) {
      if (up.is_granted) {
        userGrants.push(up.permissions.name)
      } else {
        userDenies.push(up.permissions.name)
      }
    }
  }

  // 5. Expand wildcard if explicit denies exist
  let allPermissionNames: string[] | undefined
  if (rolePermissionNames.has('*') && userDenies.length > 0) {
    const allPermissions = await prisma.permissions.findMany({
      select: { name: true },
    })
    allPermissionNames = allPermissions.map((p) => p.name)
  }

  // 6. Apply deterministic precedence via resolveEffectivePermissions:
  //    Explicit Deny > Explicit Grant > Role Permissions > Wildcard (*)
  const effectivePermissionNames = resolveEffectivePermissions(
    [...rolePermissionNames],
    userGrants,
    userDenies,
    allPermissionNames
  )

  // Default DENY: if inactive, blocked, or missing roles/permissions -> empty permissions, isBlocked: true
  const hasMissingRolesOrPermissions =
    roleNames.length === 0 && userGrants.length === 0
  const isBlocked =
    tenantUser.is_blocked ||
    tenantUser.is_active === false ||
    hasMissingRolesOrPermissions ||
    effectivePermissionNames.length === 0

  return {
    roleNames,
    roleIds,
    permissionNames: isBlocked && hasMissingRolesOrPermissions ? [] : effectivePermissionNames,
    tenantUserId: tenantUser.id,
    tenantId: tenantUser.tenant_id ?? effectiveTenantId ?? null,
    branchId: tenantUser.branch_id ?? null,
    warehouseId: tenantUser.warehouse_id ?? null,
    isBlocked,
  }
}

/**
 * Cached permission resolver using compound key `${tenantId}:${authUserId}`.
 */
export async function getCachedPermissionNames(
  authUserId: string,
  tenantId?: string
): Promise<DatabasePermissionsResult> {
  if (!authUserId) {
    return {
      roleNames: [],
      roleIds: [],
      permissionNames: [],
      tenantUserId: null,
      tenantId: null,
      branchId: null,
      warehouseId: null,
      isBlocked: false,
    }
  }

  const effectiveTenantId =
    tenantId ??
    getOptionalTenantContext()?.tenantId ??
    (await resolveTenantId(authUserId)) ??
    'none'

  if (AUTH_CACHE_TTL_MS <= 0) {
    return getDatabasePermissionNames(
      authUserId,
      effectiveTenantId !== 'none' ? effectiveTenantId : undefined
    )
  }

  const cacheKey = `${effectiveTenantId}:${authUserId}`
  const now = Date.now()
  const hit = permissionCache.get(cacheKey)

  if (hit && hit.expiresAt > now) {
    // Refresh LRU position by re-inserting at tail of Map iteration order
    permissionCache.delete(cacheKey)
    permissionCache.set(cacheKey, hit)
    return {
      roleNames: hit.roleNames,
      roleIds: hit.roleIds,
      permissionNames: hit.permissionNames,
      tenantUserId: hit.tenantUserId,
      tenantId: hit.tenantId,
      branchId: hit.branchId,
      warehouseId: hit.warehouseId,
      isBlocked: hit.isBlocked,
    }
  }

  if (hit) {
    // Proactively purge expired hit
    permissionCache.delete(cacheKey)
  }

  const fresh = await getDatabasePermissionNames(
    authUserId,
    effectiveTenantId !== 'none' ? effectiveTenantId : undefined
  )

  prunePermissionCache(now)
  permissionCache.set(cacheKey, {
    ...fresh,
    expiresAt: now + AUTH_CACHE_TTL_MS,
  })

  return fresh
}

export async function requireAuth(
  sessionToken: string,
  requiredPermissions?: string | string[],
  tenantId?: string
): Promise<AuthorizedUser> {
  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(sessionToken)

  if (error || !user) {
    throw new Error('Unauthorized: Invalid session token')
  }

  const userId = user.id

  const dbAccess = await getCachedPermissionNames(userId, tenantId)

  if (dbAccess.isBlocked) {
    throw new Error('Forbidden: User account is inactive or blocked in this tenant')
  }

  const roleNames = [...new Set([...dbAccess.roleNames])]
  const permissionNames = [...new Set([...dbAccess.permissionNames])]

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
    tenantId: tenantId ?? dbAccess.tenantId ?? getOptionalTenantContext()?.tenantId ?? null,
    tenantUserId: dbAccess.tenantUserId,
    branchId: dbAccess.branchId,
    warehouseId: dbAccess.warehouseId,
  }
}
