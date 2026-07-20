import { createFileRoute } from '@tanstack/react-router'
import {
  setPurchaseOrderStatus,
  type PurchaseOrderLifecycleStatus,
} from '@/server/fns/purchase-orders'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'

const LIFECYCLE_STATUSES: PurchaseOrderLifecycleStatus[] = [
  'draft',
  'approved',
  'sent',
  'partially_received',
  'received',
  'closed',
  'cancelled',
]

const POST = withAuth(
  PERMISSIONS.PURCHASING_MANAGE,
  async ({ request, auth }) => {
    try {
      const { userId } = auth

      const body = (await request.json()) as {
        poId?: number
        status?: PurchaseOrderLifecycleStatus
      }
      if (typeof body.poId !== 'number' || Number.isNaN(body.poId)) {
        return Response.json(
          {
            success: false,
            error: { message: 'A numeric purchase order id is required.' },
          },
          { status: 400 }
        )
      }
      if (!body.status || !LIFECYCLE_STATUSES.includes(body.status)) {
        return Response.json(
          {
            success: false,
            error: {
              message: `Status must be one of: ${LIFECYCLE_STATUSES.join(', ')}.`,
            },
          },
          { status: 400 }
        )
      }
      const data = await setPurchaseOrderStatus(userId, body.poId, body.status)
      return Response.json({ success: true, data })
    } catch (error) {
      return handleRouteError(error, 'Unable to update purchase order status')
    }
  }
)

export const Route = createFileRoute('/api/inventory/purchase-orders/status')({
  server: {
    handlers: {
      POST,
    },
  },
})
