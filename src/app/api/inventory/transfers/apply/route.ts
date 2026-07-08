import { applyTransfer } from '@/server/fns/stock-transfers'
import { getBearerToken, requireAuth } from '@/server/utils/auth'
import { handleRouteError } from '@/server/utils/api-error'

export async function POST(request: Request): Promise<Response> {
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
