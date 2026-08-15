import { AsyncLocalStorage } from 'node:async_hooks'

export interface TenantContextPayload {
  tenantId: string
  userId?: string
  role?: string
  metadata?: Record<string, unknown>
}

/**
 * AsyncLocalStorage container for request-scoped tenant identity.
 * Propagates tenant context transparently through async call chains without argument-drilling.
 */
export const tenantStorage = new AsyncLocalStorage<TenantContextPayload>()

/**
 * Run a callback within an isolated tenant context.
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
