import { correctShift } from '@/server/fns/shifts'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { createAPIFileRoute } from '@tanstack/react-start/api'
import { correctShiftInputSchema } from '@/features/respos/data/shift-schemas'
import { PERMISSIONS } from '@/features/users/data/permission-constants'

const POST = withAuth(PERMISSIONS.SHIFTS_MANAGE, async ({ request, auth }) => {
  try {
    const input = correctShiftInputSchema.parse(await request.json())
    const data = await correctShift(input, auth)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to correct shift')
  }
})

export const APIRoute = createAPIFileRoute('/api/respos/shifts/corrections')({
  POST,
})
