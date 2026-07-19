import { runCheck } from '@/server/fns/reorder-suggestions'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'
import { createAPIFileRoute } from '@tanstack/react-start/api'

const POST = withAuth(
  PERMISSIONS.PURCHASING_MANAGE,
  async ({ request, auth }) => {
    try {
      const { userId } = auth

      const body = (await request.json().catch(() => ({}))) as {
        storeId?: string
      }
      const data = await runCheck(userId, body.storeId)
      return Response.json({ success: true, data })
    } catch (error) {
      return handleRouteError(error, 'Unable to run the reorder check')
    }
  }
)

export const APIRoute = createAPIFileRoute(
  '/api/inventory/reorder-suggestions/run'
)({
  POST,
})
