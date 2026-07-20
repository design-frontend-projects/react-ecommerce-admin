import { createFileRoute } from '@tanstack/react-router'
import { correctShift } from '@/server/fns/shifts'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
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

export const Route = createFileRoute('/api/respos/shifts/corrections')({
  server: {
    handlers: {
      POST,
    },
  },
})
