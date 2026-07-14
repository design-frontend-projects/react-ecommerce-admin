import {
  setPurchaseOrderStatus,
  type PurchaseOrderLifecycleStatus,
} from '@/server/fns/purchase-orders'
import { handleRouteError } from '@/server/utils/api-error'
import { getBearerToken, requireAuth } from '@/server/utils/auth'
import { createAPIFileRoute } from '@tanstack/react-start/api'

const LIFECYCLE_STATUSES: PurchaseOrderLifecycleStatus[] = [
  'draft',
  'approved',
  'sent',
  'partially_received',
  'received',
  'closed',
  'cancelled',
]

const POST = async ({ request }: any) => {
  try {
    const token = getBearerToken(request)
    const { userId } = await requireAuth(token, 'purchasing.manage')

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

export const APIRoute = createAPIFileRoute(
  '/api/inventory/purchase-orders/status'
)({
  POST,
})
