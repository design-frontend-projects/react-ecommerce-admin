import { applyTransfer } from '@/server/fns/stock-transfers'
import { handleRouteError } from '@/server/utils/api-error'
import { getBearerToken, requireAuth } from '@/server/utils/auth'
import { createAPIFileRoute } from '@tanstack/react-start/api'

const POST = async ({ request, params }: any) => {
  try {
    const token = getBearerToken(request)
    const { userId } = await requireAuth(token, 'inventory.manage')

    const body = (await request.json()) as { id?: string }
    if (!body.id) {
      return Response.json(
        { success: false, error: { message: 'Transfer id is required.' } },
        { status: 400 }
      )
    }
    const data = await applyTransfer(userId, body.id)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to apply transfer')
  }
}

export const APIRoute = createAPIFileRoute('/api/inventory/transfers/apply')({
  POST,
})
