import {
  dismissSuggestion,
  listSuggestions,
} from '@/server/fns/reorder-suggestions'
import { handleRouteError } from '@/server/utils/api-error'
import { getBearerToken, requireAuth } from '@/server/utils/auth'
import { createAPIFileRoute } from '@tanstack/react-start/api'

const GET = async ({ request }: any) => {
  try {
    const token = getBearerToken(request)
    const { userId } = await requireAuth(token, 'purchasing.view')
    const data = await listSuggestions(userId)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to fetch reorder suggestions')
  }
}

const DELETE = async ({ request }: any) => {
  try {
    const token = getBearerToken(request)
    const { userId } = await requireAuth(token, 'purchasing.manage')
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

export const APIRoute = createAPIFileRoute(
  '/api/inventory/reorder-suggestions'
)({
  GET,
  DELETE,
})
