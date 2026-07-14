import {
  getSerialTrail,
  listSerials,
  type SerialStatus,
} from '@/server/fns/serials'
import { handleRouteError } from '@/server/utils/api-error'
import { getBearerToken, requireAuth } from '@/server/utils/auth'
import { createAPIFileRoute } from '@tanstack/react-start/api'

const GET = async ({ request }: any) => {
  try {
    const token = getBearerToken(request)
    const { userId } = await requireAuth(token, 'inventory.view')

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
}

export const APIRoute = createAPIFileRoute('/api/inventory/serials')({
  GET,
})
