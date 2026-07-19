import { getExpectedCash } from '@/server/fns/shifts'
import { handleRouteError } from '@/server/utils/api-error'
import { jsonError } from '@/server/utils/http'
import { withAuth } from '@/server/utils/with-auth'
import { createAPIFileRoute } from '@tanstack/react-start/api'
import { PERMISSIONS } from '@/features/users/data/permission-constants'

const GET = withAuth(PERMISSIONS.SHIFTS_USE, async ({ request, auth }) => {
  try {
    const shiftId = new URL(request.url).searchParams.get('shiftId')
    if (!shiftId) {
      return jsonError('shiftId is required.', 400)
    }

    const data = await getExpectedCash(shiftId, auth)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to compute expected cash')
  }
})

export const APIRoute = createAPIFileRoute('/api/respos/shifts/expected')({
  GET,
})
