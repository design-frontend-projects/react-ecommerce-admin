import { createFileRoute } from '@tanstack/react-router'
import { closeTransfer } from '@/server/fns/stock-transfers'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'

const POST = withAuth(
  PERMISSIONS.INVENTORY_MANAGE,
  async ({ request, auth }) => {
    try {
      const { userId } = auth

      const body = (await request.json()) as { id?: string; notes?: string }
      if (!body.id) {
        return Response.json(
          { success: false, error: { message: 'Transfer id is required.' } },
          { status: 400 }
        )
      }
      const data = await closeTransfer(userId, body.id, body.notes)
      return Response.json({ success: true, data })
    } catch (error) {
      return handleRouteError(error, 'Unable to close transfer')
    }
  }
)

export const Route = createFileRoute('/api/inventory/transfers/close')({
  server: {
    handlers: {
      POST,
    },
  },
})
