import { createFileRoute } from '@tanstack/react-router'
import { createCreditNote } from '@/server/fns/sales-invoice-engine'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'

const POST = withAuth(PERMISSIONS.SALES_MANAGE, async ({ request, auth }) => {
  try {
    const { userId } = auth
    const body = await request.json()
    const originalInvoiceId = body.originalInvoiceId

    if (!originalInvoiceId) {
      return Response.json(
        { success: false, error: { message: 'Original Invoice ID is required' } },
        { status: 400 }
      )
    }

    const data = await createCreditNote(userId, originalInvoiceId, {
      items: body.items,
      amount: body.amount,
      reason: body.reason,
    })
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to create credit note')
  }
})

export const Route = createFileRoute('/api/sales-invoices/credit-note')({
  server: {
    handlers: {
      POST,
    },
  },
})
