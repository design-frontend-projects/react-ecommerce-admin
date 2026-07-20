import { createFileRoute } from '@tanstack/react-router'
import {
  cancelReceipt,
  createReceipt,
  getReceipt,
  listReceipts,
  type CreateReceiptInput,
} from '@/server/fns/goods-receipts'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'

const GET = withAuth(PERMISSIONS.PURCHASING_VIEW, async ({ request, auth }) => {
  try {
    const { userId } = auth

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    const data = id ? await getReceipt(userId, id) : await listReceipts(userId)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to fetch goods receipts')
  }
})

const POST = withAuth(
  PERMISSIONS.PURCHASING_MANAGE,
  async ({ request, auth }) => {
    try {
      const { userId } = auth

      const body = (await request.json()) as CreateReceiptInput
      const data = await createReceipt(userId, body)
      return Response.json({ success: true, data })
    } catch (error) {
      return handleRouteError(error, 'Unable to create goods receipt')
    }
  }
)

const DELETE = withAuth(
  PERMISSIONS.PURCHASING_MANAGE,
  async ({ request, auth }) => {
    try {
      const { userId } = auth

      const { searchParams } = new URL(request.url)
      const id = searchParams.get('id')
      if (!id) {
        return Response.json(
          { success: false, error: { message: 'Receipt id is required.' } },
          { status: 400 }
        )
      }
      const data = await cancelReceipt(userId, id)
      return Response.json({ success: true, data })
    } catch (error) {
      return handleRouteError(error, 'Unable to cancel goods receipt')
    }
  }
)

export const Route = createFileRoute('/api/inventory/goods-receipts')({
  server: {
    handlers: {
      GET,
      POST,
      DELETE,
    },
  },
})
