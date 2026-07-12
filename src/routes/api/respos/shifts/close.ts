import { closeShift } from '@/server/fns/shifts'
import { handleRouteError } from '@/server/utils/api-error'
import { getBearerToken, requireAuth } from '@/server/utils/auth'
import { createAPIFileRoute } from '@tanstack/react-start/api'
import { closeShiftInputSchema } from '@/features/respos/data/shift-schemas'

const POST = async ({ request }: { request: Request }) => {
  try {
    const token = getBearerToken(request)
    const actor = await requireAuth(token, 'shifts.use')

    const input = closeShiftInputSchema.parse(await request.json())
    const data = await closeShift(input, actor)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to close shift')
  }
}

export const APIRoute = createAPIFileRoute('/api/respos/shifts/close')({
  POST,
})
