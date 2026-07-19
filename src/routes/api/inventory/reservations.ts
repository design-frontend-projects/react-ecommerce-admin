import { listReservations, releaseReservation } from '@/server/fns/reservations'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'
import { createAPIFileRoute } from '@tanstack/react-start/api'

const GET = withAuth(PERMISSIONS.SALES_VIEW, async ({ auth }) => {
  try {
    const { userId } = auth

    const data = await listReservations(userId)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to fetch reservations')
  }
})

const POST = withAuth(PERMISSIONS.SALES_MANAGE, async ({ request, auth }) => {
  try {
    const { userId } = auth

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
})

export const APIRoute = createAPIFileRoute('/api/inventory/reservations')({
  GET,
  POST,
})
