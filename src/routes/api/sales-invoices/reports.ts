import { createFileRoute } from '@tanstack/react-router'
import { getInvoiceReports, type InvoiceReportParams } from '@/server/fns/sales-invoice-engine'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'

const GET = withAuth(PERMISSIONS.SALES_VIEW, async ({ request, auth }) => {
  try {
    const { userId } = auth
    const { searchParams } = new URL(request.url)

    const reportType = (searchParams.get('reportType') as InvoiceReportParams['reportType']) || 'sales'
    const dateFrom = searchParams.get('dateFrom') || undefined
    const dateTo = searchParams.get('dateTo') || undefined
    const storeId = searchParams.get('storeId') || undefined
    const customerId = searchParams.get('customerId') || undefined

    const data = await getInvoiceReports(userId, {
      reportType,
      dateFrom,
      dateTo,
      storeId,
      customerId,
    })
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to generate invoice report')
  }
})

export const Route = createFileRoute('/api/sales-invoices/reports')({
  server: {
    handlers: {
      GET,
    },
  },
})
