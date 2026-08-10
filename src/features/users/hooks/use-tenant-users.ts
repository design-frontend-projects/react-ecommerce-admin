import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/hooks/use-auth'
import { useTenantUsersStore } from '@/stores/tenant-users-store'
import type { TenantUser } from '@/features/users/data/schema'

/**
 * Fetch tenant users from the API and sync to Zustand store.
 * Data is scoped by parent_auth_user_id = current user's auth_user_id.
 */
export function useTenantUsers(enabled = true) {
  const { user } = useUser()
  const { setTenantUsers, setIsLoading } = useTenantUsersStore()

  const query = useQuery<TenantUser[]>({
    queryKey: ['tenant-users', user?.id],
    queryFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('No active session')
      }

      const response = await fetch('/api/onboarding/tenant-users', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(
          (body as { error?: string }).error ?? 'Failed to fetch tenant users'
        )
      }

      const result = (await response.json()) as {
        success: boolean
        data: TenantUser[]
      }

      return result.data
    },
    enabled: enabled && !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Sync to Zustand store
  useEffect(() => {
    setIsLoading(query.isLoading)
  }, [query.isLoading, setIsLoading])

  useEffect(() => {
    if (query.data) {
      setTenantUsers(query.data)
    }
  }, [query.data, setTenantUsers])

  return query
}
