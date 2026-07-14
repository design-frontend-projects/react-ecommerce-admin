import {
  postOpeningStock,
  type PostOpeningStockInput,
} from '@/server/fns/opening-stock'
import { handleRouteError } from '@/server/utils/api-error'
import { getBearerToken, requireAuth } from '@/server/utils/auth'
import { createAPIFileRoute } from '@tanstack/react-start/api'

const POST = async ({ request }: any) => {
  try {
    const token = getBearerToken(request)
    const { userId } = await requireAuth(token, 'inventory.manage')

    const body = (await request.json()) as PostOpeningStockInput
    const data = await postOpeningStock(userId, body)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to post opening stock')
  }
}

export const APIRoute = createAPIFileRoute('/api/inventory/opening-stock')({
  POST,
})
