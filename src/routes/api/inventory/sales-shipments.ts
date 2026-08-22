import { createFileRoute } from '@tanstack/react-router'
import {
  listSalesShipments,
  createSalesShipment,
} from '@/server/fns/sales-shipments'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'

const GET = withAuth(PERMISSIONS.INVENTORY_VIEW, async ({ auth }) => {
  try {
    const data = await listSalesShipments(auth.userId)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to fetch sales shipments')
  }
})

const POST = withAuth(PERMISSIONS.INVENTORY_MANAGE, async ({ request, auth }) => {
  try {
    const body = await request.json()
    const data = await createSalesShipment(auth.userId, body)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to create sales shipment')
  }
})

export const Route = createFileRoute('/api/inventory/sales-shipments')({
  server: {
    handlers: {
      GET,
      POST,
    },
  },
})
