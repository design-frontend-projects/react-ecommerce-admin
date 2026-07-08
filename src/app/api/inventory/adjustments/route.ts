import {
  cancelAdjustment,
  createAdjustment,
  getAdjustment,
  listAdjustments,
  type CreateAdjustmentInput,
} from '@/server/fns/stock-adjustments'
import { getBearerToken, requireAuth } from '@/server/utils/auth'
import { handleRouteError } from '@/server/utils/api-error'

export async function GET(request: Request): Promise<Response> {
  try {
    const token = getBearerToken(request)
    const { userId } = await requireAuth(token, 'inventory.view')

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    const data = id
      ? await getAdjustment(userId, id)
      : await listAdjustments(userId)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to fetch adjustments')
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const token = getBearerToken(request)
    const { userId } = await requireAuth(token, 'inventory.manage')

    const body = (await request.json()) as CreateAdjustmentInput
    const data = await createAdjustment(userId, body)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to create adjustment')
  }
}

export async function DELETE(request: Request): Promise<Response> {
  try {
    const token = getBearerToken(request)
    const { userId } = await requireAuth(token, 'inventory.manage')

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return Response.json(
        { success: false, error: { message: 'Adjustment id is required.' } },
        { status: 400 }
      )
    }
    const data = await cancelAdjustment(userId, id)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to cancel adjustment')
  }
}
