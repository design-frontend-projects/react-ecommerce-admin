import {
  dismissSuggestion,
  listSuggestions,
} from '@/server/fns/reorder-suggestions'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'
import { createAPIFileRoute } from '@tanstack/react-start/api'

const GET = withAuth(PERMISSIONS.PURCHASING_VIEW, async ({ auth }) => {
  try {
    const { userId } = auth
    const data = await listSuggestions(userId)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to fetch reorder suggestions')
  }
})

const DELETE = withAuth(
  PERMISSIONS.PURCHASING_MANAGE,
  async ({ request, auth }) => {
    try {
      const { userId } = auth
      const { searchParams } = new URL(request.url)
      const id = searchParams.get('id')
      if (!id) {
        return Response.json(
          { success: false, error: { message: 'Suggestion id is required.' } },
          { status: 400 }
        )
      }
      const data = await dismissSuggestion(userId, id)
      return Response.json({ success: true, data })
    } catch (error) {
      return handleRouteError(error, 'Unable to dismiss reorder suggestion')
    }
  }
)

export const APIRoute = createAPIFileRoute(
  '/api/inventory/reorder-suggestions'
)({
  GET,
  DELETE,
})
