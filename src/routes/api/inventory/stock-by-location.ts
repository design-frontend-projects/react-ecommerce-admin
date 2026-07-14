import {
  getReconcileReport,
  listStockByLocation,
} from '@/server/fns/stock-by-location'
import { handleRouteError } from '@/server/utils/api-error'
import { getBearerToken, requireAuth } from '@/server/utils/auth'
import { createAPIFileRoute } from '@tanstack/react-start/api'

const GET = async ({ request }: any) => {
  try {
    const token = getBearerToken(request)
    const { userId } = await requireAuth(token, 'inventory.view')
    const { searchParams } = new URL(request.url)

    if (searchParams.get('reconcile')) {
      const data = await getReconcileReport(userId)
      return Response.json({ success: true, data })
    }

    const data = await listStockByLocation(userId, {
      storeId: searchParams.get('storeId') ?? undefined,
      warehouseId: searchParams.get('warehouseId') ?? undefined,
    })
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to fetch location stock')
  }
}

export const APIRoute = createAPIFileRoute('/api/inventory/stock-by-location')({
  GET,
})
