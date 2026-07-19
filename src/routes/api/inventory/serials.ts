import {
  getSerialTrail,
  listSerials,
  type SerialStatus,
} from '@/server/fns/serials'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'
import { createAPIFileRoute } from '@tanstack/react-start/api'

const GET = withAuth(PERMISSIONS.INVENTORY_VIEW, async ({ request, auth }) => {
  try {
    const { userId } = auth

    const { searchParams } = new URL(request.url)
    const trailId = searchParams.get('trail')
    if (trailId) {
      const data = await getSerialTrail(userId, trailId)
      return Response.json({ success: true, data })
    }

    const search = searchParams.get('search') ?? undefined
    const status = (searchParams.get('status') ?? undefined) as
      | SerialStatus
      | undefined
    const data = await listSerials(userId, { search, status })
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to fetch serial numbers')
  }
})

export const APIRoute = createAPIFileRoute('/api/inventory/serials')({
  GET,
})
