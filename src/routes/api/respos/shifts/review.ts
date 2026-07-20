import { createFileRoute } from '@tanstack/react-router'
import { reviewShift } from '@/server/fns/shifts'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { reviewShiftInputSchema } from '@/features/respos/data/shift-schemas'
import { PERMISSIONS } from '@/features/users/data/permission-constants'

const POST = withAuth(PERMISSIONS.SHIFTS_MANAGE, async ({ request, auth }) => {
  try {
    const input = reviewShiftInputSchema.parse(await request.json())
    const data = await reviewShift(input.shiftId, auth)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to mark shift as reviewed')
  }
})

export const Route = createFileRoute('/api/respos/shifts/review')({
  server: {
    handlers: {
      POST,
    },
  },
})
