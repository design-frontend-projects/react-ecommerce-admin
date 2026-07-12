import { getExpectedCash } from '@/server/fns/shifts'
import { handleRouteError } from '@/server/utils/api-error'
import { getBearerToken, requireAuth } from '@/server/utils/auth'
import { jsonError } from '@/server/utils/http'
import { createAPIFileRoute } from '@tanstack/react-start/api'

const GET = async ({ request }: { request: Request }) => {
  try {
    const token = getBearerToken(request)
    const actor = await requireAuth(token, 'shifts.use')

    const shiftId = new URL(request.url).searchParams.get('shiftId')
    if (!shiftId) {
      return jsonError('shiftId is required.', 400)
    }

    const data = await getExpectedCash(shiftId, actor)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to compute expected cash')
  }
}

export const APIRoute = createAPIFileRoute('/api/respos/shifts/expected')({
  GET,
})
