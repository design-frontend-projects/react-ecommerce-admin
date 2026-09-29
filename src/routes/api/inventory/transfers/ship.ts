import { createFileRoute } from '@tanstack/react-router'
import { shipTransfer, type ShipTransferInput } from '@/server/fns/stock-transfers'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'

const POST = withAuth(
  PERMISSIONS.INVENTORY_MANAGE,
  async ({ request, auth }) => {
    try {
      const { userId } = auth

      const body = (await request.json()) as ShipTransferInput & { id?: string }
      const transferId = body.transferId || body.id
      if (!transferId) {
        return Response.json(
          { success: false, error: { message: 'Transfer id is required.' } },
          { status: 400 }
        )
      }
      const data = await shipTransfer(userId, { ...body, transferId })
      return Response.json({ success: true, data })
    } catch (error) {
      return handleRouteError(error, 'Unable to ship transfer')
    }
  }
)

export const Route = createFileRoute('/api/inventory/transfers/ship')({
  server: {
    handlers: {
      POST,
    },
  },
})
