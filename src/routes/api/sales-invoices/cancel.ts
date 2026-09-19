import { createFileRoute } from '@tanstack/react-router'
import { cancelSalesInvoice } from '@/server/fns/sales-invoice-engine'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'

const POST = withAuth(PERMISSIONS.SALES_MANAGE, async ({ request, auth }) => {
  try {
    const { userId } = auth
    const body = await request.json().catch(() => ({}))
    const { searchParams } = new URL(request.url)
    const invoiceId = body.invoiceId || searchParams.get('id')
    const reason = body.reason || searchParams.get('reason')

    if (!invoiceId) {
      return Response.json(
        { success: false, error: { message: 'Invoice ID is required' } },
        { status: 400 }
      )
    }

    const data = await cancelSalesInvoice(userId, invoiceId, reason)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to cancel sales invoice')
  }
})

export const Route = createFileRoute('/api/sales-invoices/cancel')({
  server: {
    handlers: {
      POST,
    },
  },
})
