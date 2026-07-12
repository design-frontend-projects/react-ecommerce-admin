import { reviewShift } from '@/server/fns/shifts'
import { handleRouteError } from '@/server/utils/api-error'
import { getBearerToken, requireAuth } from '@/server/utils/auth'
import { createAPIFileRoute } from '@tanstack/react-start/api'
import { reviewShiftInputSchema } from '@/features/respos/data/shift-schemas'

const POST = async ({ request }: { request: Request }) => {
  try {
    const token = getBearerToken(request)
    const actor = await requireAuth(token, 'shifts.manage')

    const input = reviewShiftInputSchema.parse(await request.json())
    const data = await reviewShift(input.shiftId, actor)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to mark shift as reviewed')
  }
}

export const APIRoute = createAPIFileRoute('/api/respos/shifts/review')({
  POST,
})
