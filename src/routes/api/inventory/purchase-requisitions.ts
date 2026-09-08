import { createFileRoute } from '@tanstack/react-router'
import {
  cancelRequisition,
  createRequisition,
  deleteRequisition,
  getRequisition,
  listRequisitions,
  updateRequisition,
  type CreateRequisitionInput,
  type UpdateRequisitionInput,
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

const PUT = withAuth(PERMISSIONS.PURCHASING_MANAGE, async ({ request, auth }) => {
  try {
    const { userId } = auth
    const { searchParams } = new URL(request.url)
    const urlId = searchParams.get('id')
    const body = (await request.json()) as UpdateRequisitionInput & { id?: string }
    const id = urlId || body.id

    if (!id) {
      return Response.json(
        { success: false, error: { message: 'Requisition id is required.' } },
        { status: 400 }
      )
    }

    const data = await updateRequisition(userId, id, body)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to update requisition')
  }
})

const DELETE = withAuth(
  PERMISSIONS.PURCHASING_MANAGE,
  async ({ request, auth }) => {
    try {
      const { userId } = auth

      const { searchParams } = new URL(request.url)
      const id = searchParams.get('id')
      const permanent = searchParams.get('permanent') === 'true'

      if (!id) {
        return Response.json(
          { success: false, error: { message: 'Requisition id is required.' } },
          { status: 400 }
        )
      }

      const data = permanent
        ? await deleteRequisition(userId, id)
        : await cancelRequisition(userId, id)
      return Response.json({ success: true, data })
    } catch (error) {
      return handleRouteError(error, 'Unable to process requisition deletion/cancellation')
    }
  }
)

export const Route = createFileRoute('/api/inventory/purchase-requisitions')({
  server: {
    handlers: {
      GET,
      POST,
      PUT,
      DELETE,
    },
  },
})
