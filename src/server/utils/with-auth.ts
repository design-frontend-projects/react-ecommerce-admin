import { hasPermission } from '@/features/users/data/rbac'
import type { KnownPermission } from '@/features/users/data/permission-constants'
import { getBearerToken, requireAuth, type AuthorizedUser } from './auth'
import { jsonError } from './http'
import { resolveTenantId } from './tenant'
import { runWithTenantContext } from '@/server/context/tenant-context'
import {
  buildScopeWhere,
  type ScopedEntity,
  type UserScopeContext,
} from './scope-filter'
import prisma from '@/lib/prisma'
import { logAccessDenied } from '@/server/logging/security-audit'

/**
 * Permission requirement for a route:
 * - a single permission or an array (ANY-of, matching `requireAuth` semantics)
 * - `{ allOf: [...] }` when every permission is required
 * - `null` for authenticated-only routes (no specific permission)
 */
export type PermissionRequirement =
  | KnownPermission
  | KnownPermission[]
  | { anyOf?: KnownPermission[]; allOf?: KnownPermission[] }
  | null

export interface AuthedRouteContext {
  request: Request
  params: Record<string, string>
  auth: AuthorizedUser
  tenantId: string | null
  /** Lazily resolve (and memoize) the caller's tenant id. */
  getTenantId: () => Promise<string | null>
  tenantPrisma: typeof prisma
  scopeFilter: <T extends Record<string, unknown> = Record<string, unknown>>(
    entity: ScopedEntity,
    existingWhere?: Record<string, unknown>
  ) => T
  scopeContext?: UserScopeContext
}

export type AuthedRouteHandler = (
  ctx: AuthedRouteContext
) => Promise<Response> | Response

interface RawRouteArgs {
  request: Request
  params?: Record<string, string>
}

function toAnyOf(required: PermissionRequirement): KnownPermission[] {
  if (!required) return []
  if (typeof required === 'string') return [required]
  if (Array.isArray(required)) return required
  return required.anyOf ?? []
}

function toAllOf(required: PermissionRequirement): KnownPermission[] {
  if (required && !Array.isArray(required) && typeof required === 'object') {
    return required.allOf ?? []
  }
  return []
}

function statusForAuthError(error: unknown): 401 | 403 | 500 {
  const message = error instanceof Error ? error.message : ''
  if (
    message.startsWith('Forbidden') ||
    message.includes('Insufficient') ||
    message.includes('blocked')
  ) {
    return 403
  }
  if (message.startsWith('Unauthorized')) return 401
  return 500
}

/**
 * Centralized authorization wrapper for `createAPIFileRoute` handlers.
 * Extracts the bearer token, verifies the session, enforces the permission
 * requirement, executes inside runWithTenantContext for database multi-tenant isolation,
 * injects tenantPrisma and scopeFilter, and standardizes 401/403/500 responses.
 */
export function withAuth(
  required: PermissionRequirement,
  handler: AuthedRouteHandler
) {
  return async ({ request, params }: RawRouteArgs): Promise<Response> => {
    let auth: AuthorizedUser
    const explicitTenantId =
      request.headers.get('x-tenant-id')?.trim() || undefined

    try {
      const token = getBearerToken(request)
      auth = await requireAuth(token, toAnyOf(required), explicitTenantId)

      const allOf = toAllOf(required)
      const missing = allOf.find(
        (permission) => !hasPermission(auth.permissionNames, permission)
      )
      if (missing) {
        throw new Error(`Forbidden: Missing required permission '${missing}'`)
      }
    } catch (error) {
      const status = statusForAuthError(error)
      const message = error instanceof Error ? error.message : 'Unauthorized'

      await logAccessDenied({
        tenantId: explicitTenantId ?? null,
        resourceType: 'api_route',
        action: request.method,
        reason: message,
        route: request.url,
        ipAddress: request.headers.get('x-forwarded-for') || null,
        userAgent: request.headers.get('user-agent') || null,
      }).catch(() => {})

      return jsonError(message, status)
    }

    const tenantId =
      auth.tenantId ?? (await resolveTenantId(auth.userId))

    const isSuperAdmin = Boolean(
      auth.roleNames.includes('super_admin') ||
        auth.roleNames.includes('system_owner') ||
        auth.primaryRole === 'super_admin'
    )

    const scopeContext: UserScopeContext = {
      tenantId: tenantId || '',
      tenantUserId: auth.tenantUserId || '',
      authUserId: auth.userId,
      branchIds: auth.branchId ? [auth.branchId] : [],
      warehouseIds: auth.warehouseId ? [auth.warehouseId] : [],
      dataScope: isSuperAdmin ? 'TENANT' : 'ASSIGNED_BRANCHES',
      isSuperAdmin,
    }

    let tenantIdPromise: Promise<string | null> | undefined

    const ctx: AuthedRouteContext = {
      request,
      params: params ?? {},
      auth,
      tenantId,
      getTenantId: () => {
        tenantIdPromise ??= Promise.resolve(tenantId)
        return tenantIdPromise
      },
      tenantPrisma: prisma,
      scopeFilter: <T extends Record<string, unknown> = Record<string, unknown>>(
        entity: ScopedEntity,
        existingWhere?: Record<string, unknown>
      ): T => buildScopeWhere<T>(entity, scopeContext, existingWhere),
      scopeContext,
    }

    // Run handler inside runWithTenantContext to enforce Prisma tenant isolation
    if (tenantId) {
      return runWithTenantContext(
        {
          tenantId,
          userId: auth.userId,
          tenantUserId: auth.tenantUserId ?? undefined,
          roles: auth.roleNames,
          permissions: auth.permissionNames,
          branchIds: scopeContext.branchIds,
          warehouseIds: scopeContext.warehouseIds,
          isSuperAdmin,
        },
        async () => {
          try {
            return await handler(ctx)
          } catch (error) {
            return jsonError(
              error instanceof Error ? error.message : 'Internal Server Error',
              500
            )
          }
        }
      )
    }

    try {
      return await handler(ctx)
    } catch (error) {
      return jsonError(
        error instanceof Error ? error.message : 'Internal Server Error',
        500
      )
    }
  }
}
