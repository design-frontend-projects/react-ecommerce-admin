import { useMutation, type UseMutationOptions } from '@tanstack/react-query'
import { useAuth } from '@/hooks/use-auth'
import type { TokenGetter } from '@/lib/authorized-request'
import type { RBACConfig } from '@/hooks/use-auth-query'

// ---------------------------------------------------------------------------
// useAuthMutation — TanStack Mutation wrapper with pre-flight RBAC checks
// ---------------------------------------------------------------------------

export interface UseAuthMutationOptions<
  TData = unknown,
  TVariables = void,
  TContext = unknown,
> extends Omit<
    UseMutationOptions<TData, Error, TVariables, TContext>,
    'mutationFn'
  > {
  /**
   * Mutation function that receives `getToken` as its first argument.
   * The token is fetched lazily at call-time (not at hook-mount time).
   */
  mutationFn: (getToken: TokenGetter, variables: TVariables) => Promise<TData>
  /**
   * Optional RBAC guard. When provided, the mutation performs a **synchronous
   * pre-flight check** and throws immediately if the user lacks the required
   * permission/role — without hitting the network.
   */
  rbac?: RBACConfig
}

/**
 * Auth-aware mutation hook. Wraps `useMutation` and automatically:
 *
 * 1. Injects `getToken` into the `mutationFn`
 * 2. When `rbac` is provided, performs a **pre-flight permission check** before
 *    executing the mutation. If the check fails, the mutation rejects with an
 *    `AccessDeniedError` immediately.
 *
 * Usage:
 * ```ts
 * const create = useAuthMutation({
 *   mutationFn: (getToken, input: UomInput) => createUom(getToken, input),
 *   rbac: { permission: 'inventory.manage' },
 *   onSuccess: () => { ... },
 * })
 * ```
 */
export function useAuthMutation<
  TData = unknown,
  TVariables = void,
  TContext = unknown,
>(options: UseAuthMutationOptions<TData, TVariables, TContext>) {
  const { getToken, has } = useAuth()

  return useMutation<TData, Error, TVariables, TContext>({
    ...options,
    mutationFn: async (variables: TVariables) => {
      // Pre-flight RBAC check — fail fast before touching the network
      if (
        options.rbac &&
        !has({
          permission: options.rbac.permission,
          role: options.rbac.role,
        })
      ) {
        throw new Error('You do not have permission to perform this action.')
      }

      return options.mutationFn(getToken, variables)
    },
  })
}
