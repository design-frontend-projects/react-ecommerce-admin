import {
  cancelReceipt,
  createReceipt,
  getReceipt,
  listReceipts,
  type CreateReceiptInput,
} from '@/server/fns/goods-receipts'
import { handleRouteError } from '@/server/utils/api-error'
import { getBearerToken, requireAuth } from '@/server/utils/auth'
import { createAPIFileRoute } from '@tanstack/react-start/api'

const GET = async ({ request }: any) => {
  try {
    const token = getBearerToken(request)
    const { userId } = await requireAuth(token, 'purchasing.view')

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    const data = id ? await getReceipt(userId, id) : await listReceipts(userId)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to fetch goods receipts')
  }
}

const POST = async ({ request }: any) => {
  try {
    const token = getBearerToken(request)
    const { userId } = await requireAuth(token, 'purchasing.manage')

    const body = (await request.json()) as CreateReceiptInput
    const data = await createReceipt(userId, body)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to create goods receipt')
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

export const APIRoute = createAPIFileRoute('/api/inventory/goods-receipts')({
  GET,
  POST,
  DELETE,
})
