import {
  listBatches,
  setBatchStatus,
  type BatchToggleStatus,
} from '@/server/fns/batches'
import { handleRouteError } from '@/server/utils/api-error'
import { getBearerToken, requireAuth } from '@/server/utils/auth'
import { createAPIFileRoute } from '@tanstack/react-start/api'

const GET = async ({ request }: any) => {
  try {
    const token = getBearerToken(request)
    const { userId } = await requireAuth(token, 'inventory.view')
    const data = await listBatches(userId)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to fetch batches')
  }
}

const POST = async ({ request }: any) => {
  try {
    const token = getBearerToken(request)
    const { userId } = await requireAuth(token, 'inventory.manage')

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

export const APIRoute = createAPIFileRoute('/api/inventory/batches')({
  GET,
  POST,
})
