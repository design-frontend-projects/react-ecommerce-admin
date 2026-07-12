import { listActiveShifts } from '@/server/fns/shifts'
import { handleRouteError } from '@/server/utils/api-error'
import { getBearerToken, requireAuth } from '@/server/utils/auth'
import { createAPIFileRoute } from '@tanstack/react-start/api'

const GET = async ({ request }: { request: Request }) => {
  try {
    const token = getBearerToken(request)
    await requireAuth(token, 'shifts.view')

    const branchId =
      new URL(request.url).searchParams.get('branchId') ?? undefined
    const shifts = await listActiveShifts(branchId)
    return Response.json({ success: true, data: { shifts } })
  } catch (error) {
    return handleRouteError(error, 'Unable to fetch active shifts')
  }
}

export const APIRoute = createAPIFileRoute('/api/respos/shifts/active')({
  GET,
})
