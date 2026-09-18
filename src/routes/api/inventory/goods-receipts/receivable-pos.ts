import { createFileRoute } from '@tanstack/react-router'
import { listReceivablePurchaseOrders } from '@/server/fns/goods-receipts'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'

const GET = withAuth(PERMISSIONS.PURCHASING_VIEW, async ({ auth }) => {
  try {
    const { userId } = auth
    const data = await listReceivablePurchaseOrders(userId)
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
