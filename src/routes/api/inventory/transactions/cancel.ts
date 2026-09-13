import { createFileRoute } from '@tanstack/react-router'
import { cancelInventoryTransaction } from '@/server/fns/inventory-transaction-engine'
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
      const data = await cancelInventoryTransaction(userId, body.id, body.reason)
      return Response.json({ success: true, data })
    } catch (error) {
      return handleRouteError(error, 'Unable to cancel inventory transaction')
    }
  }
)

export const Route = createFileRoute('/api/inventory/transactions/cancel')({
  server: {
    handlers: {
      POST,
    },
  },
})
