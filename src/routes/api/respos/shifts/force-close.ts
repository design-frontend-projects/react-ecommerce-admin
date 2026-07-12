import { forceCloseShift } from '@/server/fns/shifts'
import { handleRouteError } from '@/server/utils/api-error'
import { getBearerToken, requireAuth } from '@/server/utils/auth'
import { createAPIFileRoute } from '@tanstack/react-start/api'
import { forceCloseShiftInputSchema } from '@/features/respos/data/shift-schemas'

const POST = async ({ request }: { request: Request }) => {
  try {
    const token = getBearerToken(request)
    const actor = await requireAuth(token, 'shifts.manage')

    const input = forceCloseShiftInputSchema.parse(await request.json())
    const data = await forceCloseShift(input, actor)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to force-close shift')
  }
}

export const APIRoute = createAPIFileRoute('/api/respos/shifts/force-close')({
  POST,
})
