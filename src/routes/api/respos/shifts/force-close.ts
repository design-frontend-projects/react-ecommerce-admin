import { forceCloseShift } from '@/server/fns/shifts'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { createAPIFileRoute } from '@tanstack/react-start/api'
import { forceCloseShiftInputSchema } from '@/features/respos/data/shift-schemas'
import { PERMISSIONS } from '@/features/users/data/permission-constants'

const POST = withAuth(PERMISSIONS.SHIFTS_MANAGE, async ({ request, auth }) => {
  try {
    const input = forceCloseShiftInputSchema.parse(await request.json())
    const data = await forceCloseShift(input, auth)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to force-close shift')
  }
})

export const APIRoute = createAPIFileRoute('/api/respos/shifts/force-close')({
  POST,
})
