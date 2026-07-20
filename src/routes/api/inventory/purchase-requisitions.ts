import { createFileRoute } from '@tanstack/react-router'
import {
  cancelRequisition,
  createRequisition,
  getRequisition,
  listRequisitions,
  type CreateRequisitionInput,
} from '@/server/fns/purchase-requisitions'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'

const GET = withAuth(PERMISSIONS.PURCHASING_VIEW, async ({ request, auth }) => {
  try {
    const { userId } = auth

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    const data = id
      ? await getRequisition(userId, id)
      : await listRequisitions(userId)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to fetch requisitions')
  }
})

const POST = withAuth(
  PERMISSIONS.PURCHASING_MANAGE,
  async ({ request, auth }) => {
    try {
      const { userId } = auth

      const body = (await request.json()) as CreateRequisitionInput
      const data = await createRequisition(userId, body)
      return Response.json({ success: true, data })
    } catch (error) {
      return handleRouteError(error, 'Unable to create requisition')
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
          { success: false, error: { message: 'Requisition id is required.' } },
          { status: 400 }
        )
      }
      const data = await cancelRequisition(userId, id)
      return Response.json({ success: true, data })
    } catch (error) {
      return handleRouteError(error, 'Unable to cancel requisition')
    }
  }
)

export const Route = createFileRoute('/api/inventory/purchase-requisitions')({
  server: {
    handlers: {
      GET,
      POST,
      DELETE,
    },
  },
})
