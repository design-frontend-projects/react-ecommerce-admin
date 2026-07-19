import {
  cancelAdjustment,
  createAdjustment,
  getAdjustment,
  listAdjustments,
  type CreateAdjustmentInput,
} from '@/server/fns/stock-adjustments'
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
      ? await getAdjustment(userId, id)
      : await listAdjustments(userId)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to fetch adjustments')
  }
})

const POST = withAuth(
  PERMISSIONS.INVENTORY_MANAGE,
  async ({ request, auth }) => {
    try {
      const { userId } = auth

      const body = (await request.json()) as CreateAdjustmentInput
      const data = await createAdjustment(userId, body)
      return Response.json({ success: true, data })
    } catch (error) {
      return handleRouteError(error, 'Unable to create adjustment')
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
          { success: false, error: { message: 'Adjustment id is required.' } },
          { status: 400 }
        )
      }
      const data = await cancelAdjustment(userId, id)
      return Response.json({ success: true, data })
    } catch (error) {
      return handleRouteError(error, 'Unable to cancel adjustment')
    }
  }
)

export const APIRoute = createAPIFileRoute('/api/inventory/adjustments')({
  GET,
  POST,
  DELETE,
})
