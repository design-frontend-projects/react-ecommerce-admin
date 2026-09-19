import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth-store'
import { getDiscountAnalytics, type DiscountReportsFilter } from '@/server/fns/discount-reports'

export function useDiscountAnalytics(filter: DiscountReportsFilter = {}) {
  const userId = useAuthStore((state) => state.auth.user?.id)

  return useQuery({
    queryKey: ['inv_discount_analytics', filter, userId],
    queryFn: async () => {
      if (!userId) throw new Error('User not authenticated')
      return getDiscountAnalytics(userId, filter)
    },
    enabled: !!userId,
  })
}
