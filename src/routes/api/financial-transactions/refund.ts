import { createFileRoute } from '@tanstack/react-router'
import {
  refundFinancialTransaction,
  type RefundFinancialTransactionInput,
} from '@/server/fns/financial-transactions'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'

const POST = withAuth(PERMISSIONS.INVENTORY_MANAGE, async ({ request, auth }) => {
  try {
    const { userId } = auth
    const body = (await request.json()) as RefundFinancialTransactionInput
    if (!body?.originalTransactionId) {
      return Response.json(
        { success: false, error: 'Original transaction ID is required for refund' },
        { status: 400 }
      )
    }

    const data = await refundFinancialTransaction(userId, body)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to process refund for financial transaction')
  }
})

export const Route = createFileRoute('/api/financial-transactions/refund')({
  server: {
    handlers: {
      POST,
    },
  },
})
