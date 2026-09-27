import { createFileRoute } from '@tanstack/react-router'
import {
  getPurchaseOrderReceivingDetails,
  searchReceivablePurchaseOrders,
} from '@/server/fns/goods-receipts'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'

const GET = withAuth(PERMISSIONS.PURCHASING_VIEW, async ({ request, auth }) => {
  try {
    const { userId } = auth
    const { searchParams } = new URL(request.url)

    const poId = searchParams.get('poId')
    if (poId) {
      const data = await getPurchaseOrderReceivingDetails(userId, poId)
      return Response.json({ success: true, data })
    }

    const query = searchParams.get('query') || undefined
    const supplierId = searchParams.get('supplierId') || undefined
    const warehouseId = searchParams.get('warehouseId') || undefined
    const status = searchParams.get('status') || undefined
    const dateFrom = searchParams.get('dateFrom') || undefined
    const dateTo = searchParams.get('dateTo') || undefined
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : undefined
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined

    const data = await searchReceivablePurchaseOrders(userId, {
      query,
      supplierId,
      warehouseId,
      status,
      dateFrom,
      dateTo,
      page,
      limit,
    })

    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to fetch receivable purchase orders')
  }
})

export const Route = createFileRoute(
  '/api/inventory/goods-receipts/receivable-pos'
)({
  server: {
    handlers: {
      GET,
    },
  },
})
