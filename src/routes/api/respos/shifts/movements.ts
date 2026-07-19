import { addCashMovement, listCashMovements } from '@/server/fns/shifts'
import { handleRouteError } from '@/server/utils/api-error'
import { jsonError } from '@/server/utils/http'
import { withAuth } from '@/server/utils/with-auth'
import { createAPIFileRoute } from '@tanstack/react-start/api'
import { addCashMovementInputSchema } from '@/features/respos/data/shift-schemas'
import { PERMISSIONS } from '@/features/users/data/permission-constants'

const GET = withAuth(PERMISSIONS.SHIFTS_USE, async ({ request, auth }) => {
  try {
    const shiftId = new URL(request.url).searchParams.get('shiftId')
    if (!shiftId) {
      return jsonError('shiftId is required.', 400)
    }

    const movements = await listCashMovements(shiftId, auth)
    return Response.json({ success: true, data: { movements } })
  } catch (error) {
    return handleRouteError(error, 'Unable to fetch cash movements')
  }
})

const POST = withAuth(PERMISSIONS.SHIFTS_USE, async ({ request, auth }) => {
  try {
    const input = addCashMovementInputSchema.parse(await request.json())
    const data = await addCashMovement(input, auth)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to record cash movement')
  }
})

export const APIRoute = createAPIFileRoute('/api/respos/shifts/movements')({
  GET,
  POST,
})
