import {
  cancelCount,
  createCount,
  getCount,
  listCounts,
  type CreateCountInput,
} from '@/server/fns/stock-counts'
import { handleRouteError } from '@/server/utils/api-error'
import { getBearerToken, requireAuth } from '@/server/utils/auth'
import { createAPIFileRoute } from '@tanstack/react-start/api'

const GET = async ({ request, params }: any) => {
  try {
    const token = getBearerToken(request)
    const { userId } = await requireAuth(token, 'inventory.view')

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    const data = id ? await getCount(userId, id) : await listCounts(userId)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to fetch stock counts')
  }
}

const POST = async ({ request, params }: any) => {
  try {
    const token = getBearerToken(request)
    const { userId } = await requireAuth(token, 'inventory.manage')

    const body = (await request.json()) as CreateCountInput
    const data = await createCount(userId, body)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to create stock count')
  }
}

const DELETE = async ({ request, params }: any) => {
  try {
    const token = getBearerToken(request)
    const { userId } = await requireAuth(token, 'inventory.manage')

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return Response.json(
        { success: false, error: { message: 'Stock count id is required.' } },
        { status: 400 }
      )
    }
    const data = await cancelCount(userId, id)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to cancel stock count')
  }
}

export const APIRoute = createAPIFileRoute('/api/inventory/stock-counts')({
  GET,
  POST,
  DELETE,
})
