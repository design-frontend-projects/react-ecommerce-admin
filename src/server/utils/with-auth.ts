import { hasPermission } from '@/features/users/data/rbac'
import type { KnownPermission } from '@/features/users/data/permission-constants'
import { getBearerToken, requireAuth, type AuthorizedUser } from './auth'
import { jsonError } from './http'
import { resolveTenantId } from './tenant'

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
  /** Lazily resolve (and memoize) the caller's tenant id. */
  getTenantId: () => Promise<string | null>
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

function statusForAuthError(error: unknown): 401 | 403 {
  const message = error instanceof Error ? error.message : ''
  return message.startsWith('Forbidden') ? 403 : 401
}

/**
 * Centralized authorization wrapper for `createAPIFileRoute` handlers.
 * Extracts the bearer token, verifies the session, enforces the permission
 * requirement, and standardizes 401/403/500 responses in the
 * `{ success, data, error }` envelope. Handlers keep their own try/catch for
 * domain-specific error mapping; anything uncaught becomes a 500.
 *
 * Usage:
 * ```ts
 * const GET = withAuth(PERMISSIONS.INVENTORY_VIEW, async ({ auth }) => {
 *   return Response.json({ success: true, data: await list(auth.userId) })
 * })
 * ```
 */
export function withAuth(
  required: PermissionRequirement,
  handler: AuthedRouteHandler
) {
  return async ({ request, params }: RawRouteArgs): Promise<Response> => {
    let auth: AuthorizedUser
    try {
      const token = getBearerToken(request)
      auth = await requireAuth(token, toAnyOf(required))

      const allOf = toAllOf(required)
      const missing = allOf.find(
        (permission) => !hasPermission(auth.permissionNames, permission)
      )
      if (missing) {
        throw new Error('Forbidden: Insufficient permissions')
      }
    } catch (error) {
      return jsonError(
        error instanceof Error ? error.message : 'Unauthorized',
        statusForAuthError(error)
      )
    }

    let tenantIdPromise: Promise<string | null> | undefined
    const ctx: AuthedRouteContext = {
      request,
      params: params ?? {},
      auth,
      getTenantId: () => {
        tenantIdPromise ??= resolveTenantId(auth.userId)
        return tenantIdPromise
      },
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
