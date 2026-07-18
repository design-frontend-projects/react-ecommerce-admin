import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { useAuth } from '@/hooks/use-auth'
import type { TokenGetter } from '@/lib/authorized-request'

// ---------------------------------------------------------------------------
// useAuthQuery — TanStack Query wrapper with built-in auth gating & RBAC
// ---------------------------------------------------------------------------

/**
 * RBAC configuration passed to auth-aware hooks.
 * If `permission` is set, the query/mutation is gated by that permission name.
 * If `role` is set, the query/mutation is gated by that role name.
 * Both can be supplied and are evaluated with an OR (either grants access).
 */
export interface RBACConfig {
  permission?: string
  role?: string
}

export interface UseAuthQueryOptions<
  TQueryFnData = unknown,
  TError = Error,
  TData = TQueryFnData,
> extends Omit<
    UseQueryOptions<TQueryFnData, TError, TData>,
    'queryFn' | 'enabled'
  > {
  /** Query function that receives a `getToken` helper for authorized requests. */
  queryFn: (getToken: TokenGetter) => Promise<TQueryFnData>
  /** Optional caller-controlled enabled flag (merged with auth & RBAC checks). */
  enabled?: boolean
  /** Optional RBAC guard — query stays disabled when the check fails. */
  rbac?: RBACConfig
}

/**
 * Auth-aware query hook. Wraps `useQuery` and automatically:
 *
 * 1. Waits for the auth layer to finish loading (`isLoaded`)
 * 2. Waits for a valid session (`isSignedIn`)
 * 3. Checks the RBAC permission/role when `rbac` is provided
 * 4. Injects `getToken` into the `queryFn` so callers never plumb it manually
 *
 * Returns the standard TanStack Query result **plus** `isUnauthorized` —
 * `true` when the user is signed in but lacks the required permission/role.
 */
export function useAuthQuery<
  TQueryFnData = unknown,
  TError = Error,
  TData = TQueryFnData,
>(options: UseAuthQueryOptions<TQueryFnData, TError, TData>) {
  const { getToken, isLoaded, isSignedIn, has } = useAuth()

  const rbacAllowed = options.rbac
    ? has({
        permission: options.rbac.permission,
        role: options.rbac.role,
      })
    : true

  const effectiveEnabled =
    isLoaded && isSignedIn && rbacAllowed && (options.enabled ?? true)

  const result = useQuery<TQueryFnData, TError, TData>({
    ...options,
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryFn: () => options.queryFn(getToken),
    enabled: effectiveEnabled,
  })

  return {
    ...result,
    /** `true` when the user IS signed in but LACKS the required RBAC access. */
    isUnauthorized: isLoaded && isSignedIn && !rbacAllowed,
  }
}

// ---------------------------------------------------------------------------
// useAuthEnabled — lightweight helper for Pattern-B (direct Supabase) hooks
// ---------------------------------------------------------------------------

/**
 * Returns computed `authEnabled` and `isUnauthorized` flags based on the
 * current auth state and an optional RBAC guard.
 *
 * Use this in hooks that call `supabase.from()` directly (Pattern B) so they
 * can gate their `enabled` flag without switching to `useAuthQuery`.
 */
export function useAuthEnabled(rbac?: RBACConfig) {
  const { isLoaded, isSignedIn, has } = useAuth()

  const rbacAllowed = rbac
    ? has({ permission: rbac.permission, role: rbac.role })
    : true

  return {
    /** Pass this as the `enabled` option (or part of it) to `useQuery`. */
    authEnabled: isLoaded && isSignedIn && rbacAllowed,
    /** `true` when the user IS signed in but LACKS the required RBAC access. */
    isUnauthorized: isLoaded && isSignedIn && !rbacAllowed,
  }
}
