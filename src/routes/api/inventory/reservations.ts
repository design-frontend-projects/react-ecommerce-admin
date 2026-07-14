import { listReservations, releaseReservation } from '@/server/fns/reservations'
import { handleRouteError } from '@/server/utils/api-error'
import { getBearerToken, requireAuth } from '@/server/utils/auth'
import { createAPIFileRoute } from '@tanstack/react-start/api'

const GET = async ({ request, params }: any) => {
  try {
    const token = getBearerToken(request)
    const { userId } = await requireAuth(token, 'sales.view')

    const data = await listReservations(userId)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to fetch reservations')
  }
}

const POST = async ({ request, params }: any) => {
  try {
    const token = getBearerToken(request)
    const { userId } = await requireAuth(token, 'sales.manage')

    const body = (await request.json()) as { id?: string }
    if (!body.id) {
      return Response.json(
        { success: false, error: { message: 'Reservation id is required.' } },
        { status: 400 }
      )
    }
    const data = await releaseReservation(userId, body.id)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to release reservation')
  }
}

export const APIRoute = createAPIFileRoute('/api/inventory/reservations')({
  GET,
  POST,
})
