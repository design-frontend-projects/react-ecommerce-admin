import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/use-auth'
import { fetchDashboardAnalytics } from '../data/analytics-api'
import type { DashboardAnalytics } from '../types'

export interface UseDashboardAnalyticsOptions {
  warehouseId?: string
  timeRange?: '7d' | '30d' | '90d'
}

export function useDashboardAnalytics(options: UseDashboardAnalyticsOptions = {}) {
  const { userId, isSignedIn } = useAuth()
  const { warehouseId = 'all', timeRange = '30d' } = options

  return useQuery<DashboardAnalytics, Error>({
    queryKey: ['dashboard', 'analytics', userId, warehouseId, timeRange],
    queryFn: async () => {
      if (!userId) {
        throw new Error('User not authenticated')
      }
      return fetchDashboardAnalytics({
        warehouseId: warehouseId === 'all' ? undefined : warehouseId,
        timeRange,
      })
    },
    enabled: !!userId && isSignedIn,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // 5 minutes background auto-refresh
    refetchOnWindowFocus: true,
  })
}
