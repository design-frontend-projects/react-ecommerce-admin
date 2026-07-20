import { createFileRoute } from '@tanstack/react-router'
import {
  listBatches,
  setBatchStatus,
  type BatchToggleStatus,
} from '@/server/fns/batches'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'

const GET = withAuth(PERMISSIONS.INVENTORY_VIEW, async ({ auth }) => {
  try {
    const { userId } = auth
    const data = await listBatches(userId)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to fetch batches')
  }
})

const POST = withAuth(
  PERMISSIONS.INVENTORY_MANAGE,
  async ({ request, auth }) => {
    try {
      const { userId } = auth

      const body = (await request.json()) as {
        id?: string
        status?: BatchToggleStatus
      }
      if (!body.id) {
        return Response.json(
          { success: false, error: { message: 'Batch id is required.' } },
          { status: 400 }
        )
      }
      if (!body.status) {
        return Response.json(
          { success: false, error: { message: 'Batch status is required.' } },
          { status: 400 }
        )
      }
      const data = await setBatchStatus(userId, body.id, body.status)
      return Response.json({ success: true, data })
    } catch (error) {
      return handleRouteError(error, 'Unable to update batch status')
    }
  }
)

export const Route = createFileRoute('/api/inventory/batches')({
  server: {
    handlers: {
      GET,
      POST,
    },
  },
})
