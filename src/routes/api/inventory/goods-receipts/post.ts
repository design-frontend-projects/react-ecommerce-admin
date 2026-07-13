import { createAPIFileRoute } from '@tanstack/react-start/api'

import { postReceipt } from '@/server/fns/goods-receipts'
import { getBearerToken, requireAuth } from '@/server/utils/auth'
import { handleRouteError } from '@/server/utils/api-error'

const POST = async ({ request }: any) => {
  try {
    const token = getBearerToken(request)
    const { userId } = await requireAuth(token, 'purchasing.manage')

    const body = (await request.json()) as { id?: string }
    if (!body.id) {
      return Response.json(
        { success: false, error: { message: 'Receipt id is required.' } },
        { status: 400 }
      )
    }
    const data = await postReceipt(userId, body.id)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to post goods receipt')
  }
}

export const APIRoute = createAPIFileRoute('/api/inventory/goods-receipts/post')(
  {
    POST,
  }
)
