import {
  postCount,
  reviewCount,
  saveCounts,
  snapshotCount,
  type CountEntryInput,
} from '@/server/fns/stock-counts'
import { handleRouteError } from '@/server/utils/api-error'
import { getBearerToken, requireAuth } from '@/server/utils/auth'
import { createAPIFileRoute } from '@tanstack/react-start/api'

type CountAction = 'snapshot' | 'review' | 'post' | 'save'

const POST = async ({ request, params }: any) => {
  try {
    const token = getBearerToken(request)
    const { userId } = await requireAuth(token, 'inventory.manage')

    const body = (await request.json()) as {
      id?: string
      action?: CountAction
      entries?: CountEntryInput[]
    }
    if (!body.id) {
      return Response.json(
        { success: false, error: { message: 'Stock count id is required.' } },
        { status: 400 }
      )
    }

    let data: unknown
    switch (body.action) {
      case 'snapshot':
        data = await snapshotCount(userId, body.id)
        break
      case 'save':
        data = await saveCounts(userId, body.id, body.entries ?? [])
        break
      case 'review':
        data = await reviewCount(userId, body.id)
        break
      case 'post':
        data = await postCount(userId, body.id)
        break
      default:
        return Response.json(
          { success: false, error: { message: 'Unknown count action.' } },
          { status: 400 }
        )
    }
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to update stock count')
  }
}

export const APIRoute = createAPIFileRoute(
  '/api/inventory/stock-counts/actions'
)({
  POST,
})
