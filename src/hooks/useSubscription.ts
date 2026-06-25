import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'

export interface SubscriptionStatus {
  tenant_id: string
  status: string
  end_date: string | null
  is_active: boolean
  first_use: boolean
}

export function useSubscription() {
  const session = useAuthStore((state) => state.session)

  return useQuery({
    queryKey: ['subscription', session?.user?.id],
    queryFn: async (): Promise<SubscriptionStatus> => {
      const response = await fetch('/api/tenant/subscription/status', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch subscription status')
      }
      
      return response.json()
    },
    enabled: !!session?.access_token,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
