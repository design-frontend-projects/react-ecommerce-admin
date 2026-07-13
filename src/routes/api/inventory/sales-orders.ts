import { createAPIFileRoute } from '@tanstack/react-start/api'

import {
  createOrder,
  getOrder,
  listOrders,
  type CreateOrderInput,
} from '@/server/fns/sales-orders'
import { getBearerToken, requireAuth } from '@/server/utils/auth'
import { handleRouteError } from '@/server/utils/api-error'

const GET = async ({ request, params }: any) => {
  try {
    const token = getBearerToken(request)
    const { userId } = await requireAuth(token, 'sales.view')

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    const data = id ? await getOrder(userId, id) : await listOrders(userId)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to fetch sales orders')
  }
}

const POST = async ({ request, params }: any) => {
  try {
    const token = getBearerToken(request)
    const { userId } = await requireAuth(token, 'sales.manage')

    const body = (await request.json()) as CreateOrderInput
    const data = await createOrder(userId, body)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to create sales order')
  }
}


export const APIRoute = createAPIFileRoute('/api/inventory/sales-orders')({
  GET,
  POST,
})
