import { createFileRoute } from '@tanstack/react-router'
import { getDiscountAnalytics } from '@/server/fns/discount-reports'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'

const GET = withAuth(null, async ({ auth, request }) => {
  try {
    const { userId } = auth
    const { searchParams } = new URL(request.url)
    const options = {
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      branchId: searchParams.get('branchId') || undefined,
      storeId: searchParams.get('storeId') || undefined,
    }
    const data = await getDiscountAnalytics(userId, options)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to fetch discount reports')
  }
})

export const Route = createFileRoute('/api/discount-reports')({
  server: {
    handlers: {
      GET,
    },
  },
})
