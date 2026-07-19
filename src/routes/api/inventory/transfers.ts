import {
  cancelTransfer,
  createTransfer,
  getTransfer,
  listTransfers,
  updateTransferDraft,
  type CreateTransferInput,
  type UpdateTransferInput,
} from '@/server/fns/stock-transfers'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'
import { createAPIFileRoute } from '@tanstack/react-start/api'

const GET = withAuth(PERMISSIONS.INVENTORY_VIEW, async ({ request, auth }) => {
  try {
    const { userId } = auth

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    const data = id
      ? await getTransfer(userId, id)
      : await listTransfers(userId)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to fetch transfers')
  }
})

const POST = withAuth(
  PERMISSIONS.INVENTORY_MANAGE,
  async ({ request, auth }) => {
    try {
      const { userId } = auth

      const body = (await request.json()) as CreateTransferInput
      const data = await createTransfer(userId, body)
      return Response.json({ success: true, data })
    } catch (error) {
      return handleRouteError(error, 'Unable to create transfer')
    }
  }
)

const PATCH = withAuth(
  PERMISSIONS.INVENTORY_MANAGE,
  async ({ request, auth }) => {
    try {
      const { userId } = auth

      const body = (await request.json()) as {
        id?: string
      } & UpdateTransferInput
      if (!body.id) {
        return Response.json(
          { success: false, error: { message: 'Transfer id is required.' } },
          { status: 400 }
        )
      }
      const data = await updateTransferDraft(userId, body.id, body)
      return Response.json({ success: true, data })
    } catch (error) {
      return handleRouteError(error, 'Unable to update transfer')
    }
  }
)

const DELETE = withAuth(
  PERMISSIONS.INVENTORY_MANAGE,
  async ({ request, auth }) => {
    try {
      const { userId } = auth

      const { searchParams } = new URL(request.url)
      const id = searchParams.get('id')
      if (!id) {
        return Response.json(
          { success: false, error: { message: 'Transfer id is required.' } },
          { status: 400 }
        )
      }
      const data = await cancelTransfer(userId, id)
      return Response.json({ success: true, data })
    } catch (error) {
      return handleRouteError(error, 'Unable to cancel transfer')
    }
  }
)

export const APIRoute = createAPIFileRoute('/api/inventory/transfers')({
  GET,
  POST,
  PATCH,
  DELETE,
})
