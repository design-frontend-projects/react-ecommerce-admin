import { useAuthQuery } from '@/hooks/use-auth-query'
import { fetchNavigation } from '../data/navigation'

export const navigationQueryKey = ['access-navigation'] as const

/**
 * DB-driven navigation catalog for the signed-in user (modules + allowed
 * screens, pre-filtered server-side). Invalidated by the realtime RBAC
 * subscription alongside the current-user access query, so permission
 * changes reshape the sidebar without a reload.
 */
export function useNavigation(enabled = true) {
  return useAuthQuery({
    queryKey: navigationQueryKey,
    queryFn: (getToken) => fetchNavigation(getToken),
    enabled,
    staleTime: 5 * 60_000,
  })
}
