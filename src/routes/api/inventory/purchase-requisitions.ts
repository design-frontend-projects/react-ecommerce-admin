import {
  cancelRequisition,
  createRequisition,
  getRequisition,
  listRequisitions,
  type CreateRequisitionInput,
} from '@/server/fns/purchase-requisitions'
import { handleRouteError } from '@/server/utils/api-error'
import { getBearerToken, requireAuth } from '@/server/utils/auth'
import { createAPIFileRoute } from '@tanstack/react-start/api'

const GET = async ({ request }: any) => {
  try {
    const token = getBearerToken(request)
    const { userId } = await requireAuth(token, 'purchasing.view')

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    const data = id
      ? await getRequisition(userId, id)
      : await listRequisitions(userId)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to fetch requisitions')
  }
}

const POST = async ({ request }: any) => {
  try {
    const token = getBearerToken(request)
    const { userId } = await requireAuth(token, 'purchasing.manage')

    const body = (await request.json()) as CreateRequisitionInput
    const data = await createRequisition(userId, body)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to create requisition')
  }
}

const DELETE = async ({ request }: any) => {
  try {
    const token = getBearerToken(request)
    const { userId } = await requireAuth(token, 'purchasing.manage')

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

export const APIRoute = createAPIFileRoute(
  '/api/inventory/purchase-requisitions'
)({
  GET,
  POST,
  DELETE,
})
