import { getShiftAudit } from '@/server/fns/shifts'
import { handleRouteError } from '@/server/utils/api-error'
import { jsonError } from '@/server/utils/http'
import { withAuth } from '@/server/utils/with-auth'
import { createAPIFileRoute } from '@tanstack/react-start/api'
import { PERMISSIONS } from '@/features/users/data/permission-constants'

const GET = withAuth(PERMISSIONS.SHIFTS_MANAGE, async ({ request }) => {
  try {
    const shiftId = new URL(request.url).searchParams.get('shiftId')
    if (!shiftId) {
      return jsonError('shiftId is required.', 400)
    }

    const entries = await getShiftAudit(shiftId)
    return Response.json({ success: true, data: { entries } })
  } catch (error) {
    return handleRouteError(error, 'Unable to fetch shift audit log')
  }
})

export const APIRoute = createAPIFileRoute('/api/respos/shifts/audit')({
  GET,
})
