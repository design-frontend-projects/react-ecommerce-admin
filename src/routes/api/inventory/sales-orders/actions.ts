import {
  cancelOrder,
  confirmOrder,
  fulfillOrder,
  invoiceOrder,
  setOrderStatus,
} from '@/server/fns/sales-orders'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'
import { createAPIFileRoute } from '@tanstack/react-start/api'

type OrderAction =
  | 'confirm'
  | 'picking'
  | 'packed'
  | 'fulfill'
  | 'invoice'
  | 'cancel'
  | 'complete'

const POST = withAuth(PERMISSIONS.SALES_MANAGE, async ({ request, auth }) => {
  try {
    const { userId } = auth

    const body = (await request.json()) as { id?: string; action?: OrderAction }
    if (!body.id) {
      return Response.json(
        { success: false, error: { message: 'Sales order id is required.' } },
        { status: 400 }
      )
    }

    let data: unknown
    switch (body.action) {
      case 'confirm':
        data = await confirmOrder(userId, body.id)
        break
      case 'picking':
        data = await setOrderStatus(userId, body.id, 'picking')
        break
      case 'packed':
        data = await setOrderStatus(userId, body.id, 'packed')
        break
      case 'complete':
        data = await setOrderStatus(userId, body.id, 'completed')
        break
      case 'fulfill':
        data = await fulfillOrder(userId, body.id)
        break
      case 'invoice':
        data = await invoiceOrder(userId, body.id)
        break
      case 'cancel':
        data = await cancelOrder(userId, body.id)
        break
      default:
        return Response.json(
          { success: false, error: { message: 'Unknown order action.' } },
          { status: 400 }
        )
    }
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to update sales order')
  }
})

export const APIRoute = createAPIFileRoute(
  '/api/inventory/sales-orders/actions'
)({
  POST,
})
