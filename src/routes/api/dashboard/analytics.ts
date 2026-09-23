import { createFileRoute } from '@tanstack/react-router'
import { getDashboardAnalyticsData } from '@/server/fns/dashboard-analytics'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'

const GET = withAuth(null, async ({ request, auth }) => {
  try {
    const { userId } = auth
    const { searchParams } = new URL(request.url)
    const warehouseId = searchParams.get('warehouseId') || undefined
    const timeRangeParam = searchParams.get('timeRange')
    const timeRange =
      timeRangeParam === '7d' || timeRangeParam === '90d' ? timeRangeParam : '30d'

    const data = await getDashboardAnalyticsData(userId, {
      warehouseId: warehouseId === 'all' ? undefined : warehouseId,
      timeRange,
    })

    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to fetch dashboard analytics')
  }
})

export const Route = createFileRoute('/api/dashboard/analytics')({
  server: {
    handlers: {
      GET,
    },
  },
})
