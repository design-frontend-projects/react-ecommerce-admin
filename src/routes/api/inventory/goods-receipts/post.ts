import { createFileRoute } from '@tanstack/react-router'
import { postReceipt } from '@/server/fns/goods-receipts'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'

const POST = withAuth(
  PERMISSIONS.PURCHASING_MANAGE,
  async ({ request, auth }) => {
    try {
      const { userId } = auth

      const body = (await request.json()) as { id?: string }
      if (!body.id) {
        return Response.json(
          { success: false, error: { message: 'Receipt id is required.' } },
          { status: 400 }
        )
      }
      const data = await postReceipt(userId, body.id)
      return Response.json({ success: true, data })
    } catch (error) {
      return handleRouteError(error, 'Unable to post goods receipt')
    }
  }
)

export const Route = createFileRoute('/api/inventory/goods-receipts/post')({
  server: {
    handlers: {
      POST,
    },
  },
})
