import { createFileRoute } from '@tanstack/react-router'
import { voidSalesInvoice } from '@/server/fns/sales-invoice-engine'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'

const POST = withAuth(PERMISSIONS.SALES_MANAGE, async ({ request, auth }) => {
  try {
    const { userId } = auth
    const body = await request.json()
    const invoiceId = body.invoiceId
    const reason = body.reason

    if (!invoiceId) {
      return Response.json(
        { success: false, error: { message: 'Invoice ID is required' } },
        { status: 400 }
      )
    }

    if (!reason || !reason.trim()) {
      return Response.json(
        { success: false, error: { message: 'Reason is required to void an invoice' } },
        { status: 400 }
      )
    }

    const data = await voidSalesInvoice(userId, invoiceId, reason)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to void sales invoice')
  }
})

export const Route = createFileRoute('/api/sales-invoices/void')({
  server: {
    handlers: {
      POST,
    },
  },
})
