import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth-store'

export interface SubscriptionStatus {
  tenant_id: string | null
  status: string
  end_date: string | null
  is_active: boolean
  first_use: boolean
}

export function useSubscription() {
  const session = useAuthStore((state) => state.auth.session)

  return useQuery({
    queryKey: ['subscription', session?.user?.id, session?.access_token],
    queryFn: async (): Promise<SubscriptionStatus | null> => {
      const response = await fetch('/api/tenant/subscription/status', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      })

      if (response.status === 404 || response.status === 401) {
        return null
      }

      if (!response.ok) {
        throw new Error('Failed to fetch subscription status')
      }

      return response.json()
    },
    enabled: !!session?.access_token,
    retry: (failureCount) => failureCount < 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

