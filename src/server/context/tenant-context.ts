import * as asyncHooks from 'node:async_hooks'

export type DataScopeType =
  | 'TENANT'
  | 'ASSIGNED_BRANCHES'
  | 'ASSIGNED_WAREHOUSES'
  | 'OWN_RECORDS'

/**
 * Authoritative Request-Scoped Tenant Context Payload.
 * Carries tenant identity, database user IDs, roles, permissions, and ABAC scope boundaries.
 */
export interface TenantContextPayload {
  /** Active Organization Tenant UUID */
  tenantId: string
  /** Supabase Auth User UUID (`auth.uid()`) */
  userId?: string
  /** Internal Database Primary Key (`tenant_users.id`) */
  tenantUserId?: string
  /** Primary Active Role Name (for backwards compatibility) */
  role?: string
  /** All Active Role Names aggregated for this tenant */
  roles?: string[]
  /** Effective Resolved Permission Names */
  permissions?: string[]
  /** Assigned Branch UUIDs for ABAC Branch Scoping */
  branchIds?: string[]
  /** Assigned Warehouse UUIDs for ABAC Warehouse Scoping */
  warehouseIds?: string[]
  /** Effective ABAC Data Scope */
  dataScope?: DataScopeType
  /** Platform Super-Admin or System Owner Flag */
  isSuperAdmin?: boolean
  /** Execution Metadata (e.g. IP address, user agent, requestId) */
  metadata?: Record<string, unknown>
}

/**
 * AsyncLocalStorage container for request-scoped tenant identity.
 * Propagates tenant context transparently through async call chains without argument-drilling.
 */
export const tenantStorage = (asyncHooks.AsyncLocalStorage
  ? new asyncHooks.AsyncLocalStorage<TenantContextPayload>()
  : {
      run: <R>(_store: unknown, fn: () => R) => fn(),
      getStore: () => undefined,
    }) as asyncHooks.AsyncLocalStorage<TenantContextPayload>

/**
 * Run a callback within an isolated tenant context.
 * Enforces non-empty UUID validation on tenantId and sets secure defaults.
 */
export async function runWithTenantContext<T>(
  context: TenantContextPayload,
  callback: () => Promise<T> | T
): Promise<T> {
  if (!context || !context.tenantId?.trim()) {
    throw new Error('Tenant context requires a valid, non-empty tenantId.')
  }
  return tenantStorage.run(
    {
      ...context,
      tenantId: context.tenantId.trim(),
      branchIds: context.branchIds ? [...context.branchIds] : [],
      warehouseIds: context.warehouseIds ? [...context.warehouseIds] : [],
      roles: context.roles ? [...context.roles] : context.role ? [context.role] : [],
      permissions: context.permissions ? [...context.permissions] : [],
      dataScope: context.dataScope ?? (context.isSuperAdmin ? 'TENANT' : 'ASSIGNED_BRANCHES'),
      isSuperAdmin: context.isSuperAdmin ?? false,
    },
    callback
  )
}

/**
 * Retrieve the active tenant context for the current async execution stack.
 * Throws an error if called outside an active tenant context.
 */
export function getTenantContext(): TenantContextPayload {
  const context = tenantStorage.getStore()
  if (!context || !context.tenantId) {
    throw new Error(
      'UNAUTHORIZED_TENANT_ACCESS: No active tenant context found in the current execution scope.'
    )
  }
  return context
}

/**
 * Retrieve the optional tenant context without throwing if absent.
 */
export function getOptionalTenantContext(): TenantContextPayload | undefined {
  return tenantStorage.getStore()
}

/**
 * Check whether an active tenant context currently exists in the async execution scope.
 */
export function hasActiveTenantContext(): boolean {
  const ctx = tenantStorage.getStore()
  return Boolean(ctx && ctx.tenantId)
}

/**
 * UserScopeContext interface matching M2 buildScopeWhere requirements.
 */
export interface UserScopeContext {
  tenantId: string
  tenantUserId: string
  authUserId: string
  branchIds: string[]
  warehouseIds: string[]
  dataScope: DataScopeType
  isSuperAdmin: boolean
}

/**
 * Extract a verified UserScopeContext from the active TenantContextPayload.
 */
export function getActiveScopeContext(): UserScopeContext {
  const ctx = getTenantContext()
  const isSuperAdmin = Boolean(
    ctx.isSuperAdmin ||
      ctx.roles?.includes('super_admin') ||
      ctx.roles?.includes('system_owner') ||
      ctx.role === 'super_admin'
  )
  return {
    tenantId: ctx.tenantId,
    tenantUserId: ctx.tenantUserId ?? ctx.userId ?? '',
    authUserId: ctx.userId ?? '',
    branchIds: ctx.branchIds ?? [],
    warehouseIds: ctx.warehouseIds ?? [],
    dataScope: ctx.dataScope ?? (isSuperAdmin ? 'TENANT' : 'ASSIGNED_BRANCHES'),
    isSuperAdmin,
  }
}
