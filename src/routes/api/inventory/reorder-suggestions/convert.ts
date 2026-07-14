import { convertSuggestions } from '@/server/fns/reorder-suggestions'
import { handleRouteError } from '@/server/utils/api-error'
import { getBearerToken, requireAuth } from '@/server/utils/auth'
import { createAPIFileRoute } from '@tanstack/react-start/api'

const POST = async ({ request }: any) => {
  try {
    const token = getBearerToken(request)
    const { userId } = await requireAuth(token, 'purchasing.manage')

    const body = (await request.json()) as { ids?: string[] }
    if (!Array.isArray(body.ids) || body.ids.length === 0) {
      return Response.json(
        {
          success: false,
          error: { message: 'At least one suggestion id is required.' },
        },
        { status: 400 }
      )
    }
    const data = await convertSuggestions(userId, body.ids)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to convert reorder suggestions')
  }
}

export const APIRoute = createAPIFileRoute(
  '/api/inventory/reorder-suggestions/convert'
)({
  POST,
})
