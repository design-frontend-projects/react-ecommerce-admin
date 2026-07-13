import { createAPIFileRoute } from '@tanstack/react-start/api'

import { runCheck } from '@/server/fns/reorder-suggestions'
import { handleRouteError } from '@/server/utils/api-error'
import { getBearerToken, requireAuth } from '@/server/utils/auth'

const POST = async ({ request }: any) => {
  try {
    const token = getBearerToken(request)
    const { userId } = await requireAuth(token, 'purchasing.manage')

    const body = (await request.json().catch(() => ({}))) as {
      storeId?: string
    }
    const data = await runCheck(userId, body.storeId)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to run the reorder check')
  }
}

export const APIRoute = createAPIFileRoute(
  '/api/inventory/reorder-suggestions/run'
)({
  POST,
})
