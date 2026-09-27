import { createFileRoute } from '@tanstack/react-router'
import {
  createPurchaseOrder,
  updatePurchaseOrder,
  getPurchaseOrderById,
} from '@/server/fns/purchase-orders'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'
import type {
  CreatePurchaseOrderDto,
  UpdatePurchaseOrderDto,
} from '@/server/services/purchase-order-service'

const GET = withAuth(
  PERMISSIONS.PURCHASING_VIEW,
  async ({ request, auth }) => {
    try {
      const { userId } = auth
      const { searchParams } = new URL(request.url)
      const id = searchParams.get('id')

      if (!id) {
        return Response.json(
          { success: false, error: { message: 'Purchase order id is required.' } },
          { status: 400 }
        )
      }

      const data = await getPurchaseOrderById(userId, id)
      if (!data) {
        return Response.json(
          { success: false, error: { message: 'Purchase order not found.' } },
          { status: 404 }
        )
      }

      return Response.json({ success: true, data })
    } catch (error) {
      return handleRouteError(error, 'Unable to fetch purchase order')
    }
  }
)

const POST = withAuth(
  PERMISSIONS.PURCHASING_MANAGE,
  async ({ request, auth }) => {
    try {
      const { userId } = auth
      const body = (await request.json()) as CreatePurchaseOrderDto
      const data = await createPurchaseOrder(userId, body)
      return Response.json({ success: true, data })
    } catch (error) {
      return handleRouteError(error, 'Unable to create purchase order')
    }
  }
)

const PUT = withAuth(
  PERMISSIONS.PURCHASING_MANAGE,
  async ({ request, auth }) => {
    try {
      const { userId } = auth
      const body = (await request.json()) as UpdatePurchaseOrderDto
      if (!body.id) {
        return Response.json(
          { success: false, error: { message: 'Purchase order id is required.' } },
          { status: 400 }
        )
      }
      const data = await updatePurchaseOrder(userId, body)
      return Response.json({ success: true, data })
    } catch (error) {
      return handleRouteError(error, 'Unable to update purchase order')
    }
  }
)

export const Route = createFileRoute('/api/inventory/purchase-orders/')({
  server: {
    handlers: {
      GET,
      POST,
      PUT,
    },
  },
})
