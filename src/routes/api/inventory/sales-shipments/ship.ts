import { createFileRoute } from '@tanstack/react-router'
import { dispatchSalesShipment } from '@/server/fns/sales-shipments'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'

const POST = withAuth(PERMISSIONS.INVENTORY_MANAGE, async ({ request, auth }) => {
  try {
    const body = await request.json()
    const data = await dispatchSalesShipment(auth.userId, body.id)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to dispatch sales shipment')
  }
})

export const Route = createFileRoute('/api/inventory/sales-shipments/ship')({
  server: {
    handlers: {
      POST,
    },
  },
})
