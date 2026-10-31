/**
 * src/server/utils/with-server-fn-auth.ts
 *
 * Enterprise Zero-Trust Higher-Order Wrapper & Middleware for TanStack Start Server Functions.
 * Enforces:
 * 1. Multi-source token extraction (Bearer header, Cookies, payload, AsyncLocalStorage).
 * 2. Strict tenant isolation & membership validation (Default DENY).
 * 3. Authoritative permission resolution & blocked account checks.
 * 4. Automatic runWithTenantContext activation for multi-tenant Prisma extension.
 * 5. Query-level ABAC scope filter injection (scopeFilter, tenantPrisma, scopeContext).
 * 6. Standardized HTTP 401/403 error mapping & tamper-resistant security audit logging.
 */

import prisma from '@/lib/prisma'
import { ApiError } from '@/server/utils/api-error'
import {
  requireAuth,
  type AuthorizedUser,
} from '@/server/utils/auth'
import {
  runWithTenantContext,
  getOptionalTenantContext,
  type DataScopeType,
} from '@/server/context/tenant-context'
import {
  buildScopeWhere,
  type ScopedEntity,
  type UserScopeContext,
} from '@/server/utils/scope-filter'
import { resolveTenantId } from '@/server/utils/tenant'
import { hasPermission, hasAnyPermission } from '@/features/users/data/rbac'
import { logAccessDenied } from '@/server/logging/security-audit'

// ─────────────────────────────────────────────────────────────────────────────
// Types & Contracts
// ─────────────────────────────────────────────────────────────────────────────

export type ServerFnPermissionRequirement =
  | string
  | string[]
  | { anyOf?: string[]; allOf?: string[] }
  | ((
      user: AuthorizedUser,
      meta?: { tenantId: string; request?: Request }
    ) => boolean | Promise<boolean>)
  | null

export interface WithServerFnAuthOptions {
  /**
   * Required permission(s) or custom check function.
   * - null/undefined: authenticated & active tenant member only.
   * - string: single permission required.
   * - string[]: any of the permissions required.
   * - { anyOf, allOf }: structured permission evaluation.
   * - function: custom predicate returning boolean.
   */
  permissions?: ServerFnPermissionRequirement

  /**
   * Mandatory minimum data scope requirement (e.g. 'TENANT', 'ASSIGNED_BRANCHES').
   */
  dataScope?: DataScopeType

  /**
   * Explicit tenant ID (overrides header / token resolution if user is member).
   */
  tenantId?: string

  /**
   * Whether tenant membership is mandatory (default: true).
   */
  requireTenant?: boolean

  /**
   * Allow self-action when target user ID matches caller user ID.
   */
  allowSelf?: boolean

  /**
   * Field name in input object containing target user ID for allowSelf evaluation.
   */
  targetUserIdKey?: string

  /**
   * Resource type name for security audit logging on access denial.
   */
  resourceType?: string

  /**
   * Action name for security audit logging.
   */
  actionName?: string
}

export interface AuthorizedContext {
  /** Authoritative authenticated user metadata */
  user: AuthorizedUser

  /** Active organization tenant UUID */
  tenantId: string

  /** Internal database ID (`tenant_users.id`) */
  tenantUserId: string

  /** Assigned branch UUIDs for ABAC branch scoping */
  branchIds: string[]

  /** Assigned warehouse UUIDs for ABAC warehouse scoping */
  warehouseIds: string[]

  /** Effective ABAC data scope */
  dataScope: DataScopeType

  /** User scope context matching M2 buildScopeWhere */
  scopeContext: UserScopeContext

  /** Multi-tenant scoped Prisma client */
  tenantPrisma: typeof prisma

  /** Query-level ABAC scope filter builder */
  scopeFilter: <T extends Record<string, unknown> = Record<string, unknown>>(
    entity: ScopedEntity,
    existingWhere?: Record<string, unknown>
  ) => T

  /** Original Request object if invoked in web/HTTP runtime */
  request?: Request

  /** Additional execution metadata */
  metadata?: Record<string, unknown>
}

export interface ServerFnCallOptions {
  token?: string
  sessionToken?: string
  tenantId?: string
  request?: Request
}

export type ServerFnHandler<TInput, TOutput> = (
  input: TInput,
  ctx: AuthorizedContext
) => Promise<TOutput> | TOutput

// ─────────────────────────────────────────────────────────────────────────────
// Token Extraction Helpers
// ─────────────────────────────────────────────────────────────────────────────

function extractTokenFromRequest(req: Request): string | null {
  // 1. Authorization: Bearer <token>
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim()
    if (token) return token
  }

  // 2. Custom header: x-session-token or x-supabase-auth
  const sessionHeader =
    req.headers.get('x-session-token') || req.headers.get('x-supabase-auth')
  if (sessionHeader?.trim()) return sessionHeader.trim()

  // 3. Cookie header
  const cookieHeader = req.headers.get('cookie')
  if (cookieHeader) {
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map((c) => {
        const [k, ...v] = c.trim().split('=')
        return [k, decodeURIComponent(v.join('='))]
      })
    )
    const token =
      cookies['sb-access-token'] ||
      cookies['sb-auth-token'] ||
      cookies['access_token'] ||
      cookies['auth_token']
    if (token?.trim()) return token.trim()
  }

  return null
}

async function tryGetStartRequest(): Promise<Request | undefined> {
  try {
    const { getRequest } = await import('@tanstack/react-start/server')
    return getRequest()
  } catch {
    return undefined
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// User Scope Context Resolution
// ─────────────────────────────────────────────────────────────────────────────

async function resolveUserScopeContext(
  user: AuthorizedUser,
  effectiveTenantId: string,
  requiredDataScope?: DataScopeType
): Promise<{
  branchIds: string[]
  warehouseIds: string[]
  dataScope: DataScopeType
  scopeContext: UserScopeContext
}> {
  const isSuperAdmin = Boolean(
    user.roleNames.includes('super_admin') ||
      user.roleNames.includes('system_owner') ||
      user.primaryRole === 'super_admin'
  )

  const tenantUserId = user.tenantUserId || ''

  // Query companion assignment tables
  let branchIds: string[] = []
  let warehouseIds: string[] = []

  if (tenantUserId && effectiveTenantId) {
    const [branches, warehouses] = await Promise.all([
      prisma.tenant_user_branches.findMany({
        where: { tenant_user_id: tenantUserId, tenant_id: effectiveTenantId },
        select: { branch_id: true },
      }),
      prisma.tenant_user_warehouses.findMany({
        where: { tenant_user_id: tenantUserId, tenant_id: effectiveTenantId },
        select: { warehouse_id: true },
      }),
    ])

    branchIds = branches.map((b) => b.branch_id).filter(Boolean)
    warehouseIds = warehouses.map((w) => w.warehouse_id).filter(Boolean)
  }

  // Fallback to legacy single branch/warehouse if companion tables are empty
  if (branchIds.length === 0 && user.branchId) {
    branchIds.push(user.branchId)
  }
  if (warehouseIds.length === 0 && user.warehouseId) {
    warehouseIds.push(user.warehouseId)
  }

  // Resolve effective dataScope from user's active roles
  let effectiveDataScope: DataScopeType = 'ASSIGNED_BRANCHES'
  if (isSuperAdmin) {
    effectiveDataScope = 'TENANT'
  } else if (user.roleNames.length > 0) {
    const roles = await prisma.roles.findMany({
      where: {
        name: { in: user.roleNames },
        is_active: true,
        OR: [{ tenant_id: null }, { tenant_id: effectiveTenantId }],
      },
      select: { data_scope: true },
    })

    const scopes = roles.map((r) => r.data_scope).filter(Boolean)
    if (scopes.includes('TENANT')) {
      effectiveDataScope = 'TENANT'
    } else if (scopes.includes('ASSIGNED_BRANCHES')) {
      effectiveDataScope = 'ASSIGNED_BRANCHES'
    } else if (scopes.includes('ASSIGNED_WAREHOUSES')) {
      effectiveDataScope = 'ASSIGNED_WAREHOUSES'
    } else if (scopes.includes('OWN_RECORDS')) {
      effectiveDataScope = 'OWN_RECORDS'
    }
  }

  // Validate requiredDataScope constraint if specified
  if (requiredDataScope && !isSuperAdmin) {
    const scopeRank: Record<DataScopeType, number> = {
      TENANT: 4,
      ASSIGNED_BRANCHES: 3,
      ASSIGNED_WAREHOUSES: 3,
      OWN_RECORDS: 1,
    }
    if (
      (scopeRank[effectiveDataScope] ?? 0) < (scopeRank[requiredDataScope] ?? 0)
    ) {
      throw new ApiError(
        `Forbidden: Insufficient data scope. Required: '${requiredDataScope}', Active: '${effectiveDataScope}'`,
        403
      )
    }
  }

  const scopeContext: UserScopeContext = {
    tenantId: effectiveTenantId,
    tenantUserId,
    authUserId: user.userId,
    branchIds,
    warehouseIds,
    dataScope: effectiveDataScope,
    isSuperAdmin,
  }

  return {
    branchIds,
    warehouseIds,
    dataScope: effectiveDataScope,
    scopeContext,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Permission Check Helper
// ─────────────────────────────────────────────────────────────────────────────

async function checkPermissions(
  user: AuthorizedUser,
  required: ServerFnPermissionRequirement,
  tenantId: string,
  req?: Request
): Promise<void> {
  if (!required) return

  if (typeof required === 'function') {
    const passed = await required(user, { tenantId, request: req })
    if (!passed) {
      throw new ApiError('Forbidden: Insufficient permissions', 403)
    }
    return
  }

  if (typeof required === 'string') {
    if (!hasPermission(user.permissionNames, required)) {
      throw new ApiError(
        `Forbidden: Missing required permission '${required}'`,
        403
      )
    }
    return
  }

  if (Array.isArray(required)) {
    if (!hasAnyPermission(user.permissionNames, required)) {
      throw new ApiError('Forbidden: Insufficient permissions', 403)
    }
    return
  }

  if (typeof required === 'object') {
    if (required.anyOf && required.anyOf.length > 0) {
      if (!hasAnyPermission(user.permissionNames, required.anyOf)) {
        throw new ApiError('Forbidden: Insufficient permissions', 403)
      }
    }
    if (required.allOf && required.allOf.length > 0) {
      for (const perm of required.allOf) {
        if (!hasPermission(user.permissionNames, perm)) {
          throw new ApiError(
            `Forbidden: Missing required permission '${perm}'`,
            403
          )
        }
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Core Wrapper Implementation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Universal higher-order wrapper protecting TanStack Start server functions and actions.
 */
export function withServerFnAuth<TInput, TOutput>(
  options: WithServerFnAuthOptions,
  handler: ServerFnHandler<TInput, TOutput>
) {
  return async function wrappedServerFn(
    rawInputOrStartArgs?: unknown,
    callOptions?: ServerFnCallOptions
  ): Promise<TOutput> {
    const req = callOptions?.request ?? (await tryGetStartRequest())

    // 1. Detect if invoked from TanStack Start createServerFn({ method }).handler(...)
    let input: TInput
    let explicitToken: string | undefined =
      callOptions?.token ?? callOptions?.sessionToken
    let explicitTenantId: string | undefined =
      options.tenantId ?? callOptions?.tenantId

    const isStartHandlerArgs =
      !callOptions &&
      rawInputOrStartArgs !== null &&
      typeof rawInputOrStartArgs === 'object' &&
      ('serverFnMeta' in (rawInputOrStartArgs as Record<string, unknown>) ||
        'signal' in (rawInputOrStartArgs as Record<string, unknown>) ||
        ('context' in (rawInputOrStartArgs as Record<string, unknown>) &&
          'data' in (rawInputOrStartArgs as Record<string, unknown>)))

    if (isStartHandlerArgs) {
      const startArgs = rawInputOrStartArgs as { data?: unknown; context?: unknown }
      input = startArgs.data as TInput
      if (typeof input === 'object' && input !== null) {
        explicitToken ??=
          (input as Record<string, unknown>).sessionToken as string | undefined ??
          (input as Record<string, unknown>).token as string | undefined
        explicitTenantId ??= (input as Record<string, unknown>).tenantId as
          | string
          | undefined
      }
    } else {
      input = rawInputOrStartArgs as TInput
      if (typeof input === 'object' && input !== null) {
        explicitToken ??=
          (input as Record<string, unknown>).sessionToken as string | undefined ??
          (input as Record<string, unknown>).token as string | undefined
        explicitTenantId ??= (input as Record<string, unknown>).tenantId as
          | string
          | undefined
      }
    }

    // 2. Extract Auth Token
    const token = explicitToken ?? (req ? extractTokenFromRequest(req) : null)

    if (!token) {
      // Check for existing ambient context
      const existingCtx = getOptionalTenantContext()
      if (!existingCtx?.userId) {
        await logAccessDenied({
          tenantId: explicitTenantId ?? null,
          resourceType: options.resourceType || 'server_function',
          action: options.actionName || 'invoke',
          reason: 'Unauthorized: Missing session or bearer token',
          route: req?.url,
        }).catch(() => {})
        throw new ApiError('Unauthorized: Missing bearer token', 401)
      }
    }

    // 3. Resolve Target Tenant ID
    let tenantId = explicitTenantId
    if (!tenantId && req) {
      tenantId = req.headers.get('x-tenant-id')?.trim() || undefined
    }

    // 4. Authenticate User & Verify Permissions via Central Engine
    let user: AuthorizedUser
    try {
      user = await requireAuth(token!, undefined, tenantId)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unauthorized'
      const status =
        message.startsWith('Forbidden') ||
        message.includes('Insufficient') ||
        message.includes('blocked')
          ? 403
          : 401

      await logAccessDenied({
        tenantId: tenantId ?? null,
        resourceType: options.resourceType || 'server_function',
        action: options.actionName || 'invoke',
        reason: message,
        route: req?.url,
      }).catch(() => {})

      throw new ApiError(message, status)
    }

    const effectiveTenantId =
      tenantId ?? user.tenantId ?? (await resolveTenantId(user.userId))

    if (options.requireTenant !== false && !effectiveTenantId) {
      await logAccessDenied({
        actorAuthUserId: user.userId,
        resourceType: options.resourceType || 'server_function',
        action: options.actionName || 'invoke',
        reason: 'Forbidden: No active organization tenant membership',
        route: req?.url,
      }).catch(() => {})
      throw new ApiError(
        'Forbidden: No active tenant context available for this user',
        403
      )
    }

    // 5. Evaluate allowSelf Exception
    let skipPermissionCheck = false
    if (
      options.allowSelf &&
      options.targetUserIdKey &&
      input &&
      typeof input === 'object'
    ) {
      const targetUserId = (input as Record<string, unknown>)[
        options.targetUserIdKey
      ]
      if (
        targetUserId &&
        (targetUserId === user.userId || targetUserId === user.tenantUserId)
      ) {
        skipPermissionCheck = true
      }
    }

    // 6. Check Permissions
    if (!skipPermissionCheck && options.permissions) {
      try {
        await checkPermissions(
          user,
          options.permissions,
          effectiveTenantId!,
          req
        )
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Forbidden'
        await logAccessDenied({
          tenantId: effectiveTenantId ?? null,
          actorAuthUserId: user.userId,
          actorTenantUserId: user.tenantUserId ?? null,
          resourceType: options.resourceType || 'server_function',
          action: options.actionName || 'invoke',
          reason: message,
          route: req?.url,
        }).catch(() => {})
        throw error
      }
    }

    // 7. Resolve User Scope Context (Branches, Warehouses, Scopes)
    const { branchIds, warehouseIds, dataScope, scopeContext } =
      await resolveUserScopeContext(
        user,
        effectiveTenantId!,
        options.dataScope
      )

    // 8. Build Typed AuthorizedContext
    const authContext: AuthorizedContext = {
      user,
      tenantId: effectiveTenantId!,
      tenantUserId: user.tenantUserId || '',
      branchIds,
      warehouseIds,
      dataScope,
      scopeContext,
      tenantPrisma: prisma,
      scopeFilter: <T extends Record<string, unknown> = Record<string, unknown>>(
        entity: ScopedEntity,
        existingWhere?: Record<string, unknown>
      ): T => buildScopeWhere<T>(entity, scopeContext, existingWhere),
      request: req,
      metadata: {
        method: req?.method,
        url: req?.url,
      },
    }

    // 9. Execute inside runWithTenantContext to guarantee multi-tenant Prisma isolation
    return runWithTenantContext(
      {
        tenantId: effectiveTenantId!,
        userId: user.userId,
        tenantUserId: user.tenantUserId ?? undefined,
        roles: user.roleNames,
        permissions: user.permissionNames,
        branchIds,
        warehouseIds,
        dataScope,
        isSuperAdmin: scopeContext.isSuperAdmin,
      },
      () => handler(input, authContext)
    )
  }
}
