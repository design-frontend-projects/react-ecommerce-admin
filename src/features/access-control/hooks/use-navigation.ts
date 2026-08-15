import { useAuthStore } from '@/stores/auth-store'
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
  const profile = useAuthStore((state) => state.auth.profile)
  const isInitializing = useAuthStore((state) => state.auth.isInitializing)
  const isOnboarded =
    profile?.onboarding_complete === true || profile?.id != null

  const shouldFetch = !isInitializing && isOnboarded && enabled

  return useAuthQuery({
    queryKey: navigationQueryKey,
    queryFn: (getToken) => fetchNavigation(getToken),
    enabled: shouldFetch,
    staleTime: 5 * 60_000,
  })
}
