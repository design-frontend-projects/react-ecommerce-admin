import { createFileRoute } from '@tanstack/react-router'
import { reverseInventoryTransaction } from '@/server/fns/inventory-transaction-engine'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'

const POST = withAuth(
  PERMISSIONS.INVENTORY_MANAGE,
  async ({ request, auth }) => {
    try {
      const { userId } = auth
      const body = (await request.json()) as { id?: string; reason?: string }
      if (!body.id) {
        return Response.json(
          { success: false, error: { message: 'Transaction id is required.' } },
          { status: 400 }
        )
      }
      if (!body.reason) {
        return Response.json(
          { success: false, error: { message: 'A reversal reason is required.' } },
          { status: 400 }
        )
      }
      const data = await reverseInventoryTransaction(userId, body.id, body.reason)
      return Response.json({ success: true, data })
    } catch (error) {
      return handleRouteError(error, 'Unable to reverse inventory transaction')
    }
  }
)

export const Route = createFileRoute('/api/inventory/transactions/reverse')({
  server: {
    handlers: {
      POST,
    },
  },
})
