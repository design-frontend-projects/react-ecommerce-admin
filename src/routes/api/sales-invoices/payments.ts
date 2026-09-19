import { createFileRoute } from '@tanstack/react-router'
import {
  recordInvoicePayment,
  type RecordInvoicePaymentInput,
} from '@/server/fns/sales-invoice-engine'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'

const POST = withAuth(PERMISSIONS.SALES_MANAGE, async ({ request, auth }) => {
  try {
    const { userId } = auth
    const body = await request.json()
    const { searchParams } = new URL(request.url)
    const invoiceId = body.invoiceId || searchParams.get('id')

    if (!invoiceId) {
      return Response.json(
        { success: false, error: { message: 'Invoice ID is required' } },
        { status: 400 }
      )
    }

    const paymentInput: RecordInvoicePaymentInput = {
      paymentMethod: body.paymentMethod,
      amount: body.amount,
      currency: body.currency,
      referenceNumber: body.referenceNumber,
      notes: body.notes,
      paymentDate: body.paymentDate,
    }

    const data = await recordInvoicePayment(userId, invoiceId, paymentInput)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to record invoice payment')
  }
})

export const Route = createFileRoute('/api/sales-invoices/payments')({
  server: {
    handlers: {
      POST,
    },
  },
})
