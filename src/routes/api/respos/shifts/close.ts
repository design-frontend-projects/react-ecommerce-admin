import { closeShift } from '@/server/fns/shifts'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { createAPIFileRoute } from '@tanstack/react-start/api'
import { closeShiftInputSchema } from '@/features/respos/data/shift-schemas'
import { PERMISSIONS } from '@/features/users/data/permission-constants'

const POST = withAuth(PERMISSIONS.SHIFTS_USE, async ({ request, auth }) => {
  try {
    const input = closeShiftInputSchema.parse(await request.json())
    const data = await closeShift(input, auth)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to close shift')
  }
})

export const APIRoute = createAPIFileRoute('/api/respos/shifts/close')({
  POST,
})
