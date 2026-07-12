import { addCashMovement, listCashMovements } from '@/server/fns/shifts'
import { handleRouteError } from '@/server/utils/api-error'
import { getBearerToken, requireAuth } from '@/server/utils/auth'
import { jsonError } from '@/server/utils/http'
import { createAPIFileRoute } from '@tanstack/react-start/api'
import { addCashMovementInputSchema } from '@/features/respos/data/shift-schemas'

const GET = async ({ request }: { request: Request }) => {
  try {
    const token = getBearerToken(request)
    const actor = await requireAuth(token, 'shifts.use')

    const shiftId = new URL(request.url).searchParams.get('shiftId')
    if (!shiftId) {
      return jsonError('shiftId is required.', 400)
    }

    const movements = await listCashMovements(shiftId, actor)
    return Response.json({ success: true, data: { movements } })
  } catch (error) {
    return handleRouteError(error, 'Unable to fetch cash movements')
  }
}

const POST = async ({ request }: { request: Request }) => {
  try {
    const token = getBearerToken(request)
    const actor = await requireAuth(token, 'shifts.use')

    const input = addCashMovementInputSchema.parse(await request.json())
    const data = await addCashMovement(input, actor)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to record cash movement')
  }
}

export const APIRoute = createAPIFileRoute('/api/respos/shifts/movements')({
  GET,
  POST,
})
