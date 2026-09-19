import { createFileRoute } from '@tanstack/react-router'
import { getInvoiceDashboardStats } from '@/server/fns/sales-invoice-engine'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'

const GET = withAuth(PERMISSIONS.SALES_VIEW, async ({ request, auth }) => {
  try {
    const { userId } = auth
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from') || undefined
    const to = searchParams.get('to') || undefined

    const data = await getInvoiceDashboardStats(userId, { from, to })
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to fetch invoice dashboard stats')
  }
})

export const Route = createFileRoute('/api/sales-invoices/dashboard')({
  server: {
    handlers: {
      GET,
    },
  },
})
