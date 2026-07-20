import { createFileRoute } from '@tanstack/react-router'
import {
  createOrder,
  getOrder,
  listOrders,
  type CreateOrderInput,
} from '@/server/fns/sales-orders'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'

const GET = withAuth(PERMISSIONS.SALES_VIEW, async ({ request, auth }) => {
  try {
    const { userId } = auth

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    const data = id ? await getOrder(userId, id) : await listOrders(userId)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to fetch sales orders')
  }
})

const POST = withAuth(PERMISSIONS.SALES_MANAGE, async ({ request, auth }) => {
  try {
    const { userId } = auth

    const body = (await request.json()) as CreateOrderInput
    const data = await createOrder(userId, body)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to create sales order')
  }
})

export const Route = createFileRoute('/api/inventory/sales-orders')({
  server: {
    handlers: {
      GET,
      POST,
    },
  },
})
