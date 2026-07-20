import { createFileRoute } from '@tanstack/react-router'
import {
  postOpeningStock,
  type PostOpeningStockInput,
} from '@/server/fns/opening-stock'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'

const POST = withAuth(
  PERMISSIONS.INVENTORY_MANAGE,
  async ({ request, auth }) => {
    try {
      const { userId } = auth

      const body = (await request.json()) as PostOpeningStockInput
      const data = await postOpeningStock(userId, body)
      return Response.json({ success: true, data })
    } catch (error) {
      return handleRouteError(error, 'Unable to post opening stock')
    }
  }
)

export const Route = createFileRoute('/api/inventory/opening-stock')({
  server: {
    handlers: {
      POST,
    },
  },
})
