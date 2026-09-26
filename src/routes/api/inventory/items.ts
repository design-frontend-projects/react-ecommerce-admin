import { createFileRoute } from '@tanstack/react-router'
import { listInventoryItemsPaginated } from '@/server/fns/inventory-items'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'

const GET = withAuth(
  [
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.SALES_VIEW,
    PERMISSIONS.ORDERS_VIEW,
    PERMISSIONS.ORDERS_CREATE,
  ],
  async ({ request, auth }) => {
    try {
      const { userId } = auth
      const { searchParams } = new URL(request.url)

      const search = searchParams.get('search') ?? undefined
      const page = searchParams.get('page') ? Number(searchParams.get('page')) : 1
      const pageSize = searchParams.get('pageSize')
        ? Number(searchParams.get('pageSize'))
        : searchParams.get('limit')
          ? Number(searchParams.get('limit'))
          : 20
      const sortBy = searchParams.get('sortBy') ?? undefined
      const sortOrder = (searchParams.get('sortOrder') ?? undefined) as
        | 'asc'
        | 'desc'
        | undefined
      const status = searchParams.get('status') ?? undefined
      const trackingType = searchParams.get('trackingType') ?? undefined
      const warehouseId = searchParams.get('warehouseId') ?? undefined
      const warehouseName = searchParams.get('warehouseName') ?? undefined
      const storeId = searchParams.get('storeId') ?? undefined

      const data = await listInventoryItemsPaginated(userId, {
        search,
        page,
        pageSize,
        sortBy,
        sortOrder,
        status,
        trackingType,
        warehouseId,
        warehouseName,
        storeId,
      })

      return Response.json({ success: true, ...data })
    } catch (error) {
      return handleRouteError(error, 'Unable to fetch inventory items')
    }
  }
)

export const Route = createFileRoute('/api/inventory/items')({
  server: {
    handlers: {
      GET,
    },
  },
})
