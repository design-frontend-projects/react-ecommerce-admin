import { getShiftAudit } from '@/server/fns/shifts'
import { handleRouteError } from '@/server/utils/api-error'
import { getBearerToken, requireAuth } from '@/server/utils/auth'
import { jsonError } from '@/server/utils/http'
import { createAPIFileRoute } from '@tanstack/react-start/api'

const GET = async ({ request }: { request: Request }) => {
  try {
    const token = getBearerToken(request)
    await requireAuth(token, 'shifts.manage')

    const shiftId = new URL(request.url).searchParams.get('shiftId')
    if (!shiftId) {
      return jsonError('shiftId is required.', 400)
    }

    const entries = await getShiftAudit(shiftId)
    return Response.json({ success: true, data: { entries } })
  } catch (error) {
    return handleRouteError(error, 'Unable to fetch shift audit log')
  }
}

export const APIRoute = createAPIFileRoute('/api/respos/shifts/audit')({
  GET,
})
