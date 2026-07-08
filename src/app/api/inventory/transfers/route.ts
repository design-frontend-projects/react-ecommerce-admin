import {
  cancelTransfer,
  createTransfer,
  getTransfer,
  listTransfers,
  updateTransferDraft,
  type CreateTransferInput,
  type UpdateTransferInput,
} from '@/server/fns/stock-transfers'
import { getBearerToken, requireAuth } from '@/server/utils/auth'
import { handleRouteError } from '@/server/utils/api-error'

export async function GET(request: Request): Promise<Response> {
  try {
    const token = getBearerToken(request)
    const { userId } = await requireAuth(token, 'inventory.view')

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    const data = id
      ? await getTransfer(userId, id)
      : await listTransfers(userId)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to fetch transfers')
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const token = getBearerToken(request)
    const { userId } = await requireAuth(token, 'inventory.manage')

    const body = (await request.json()) as CreateTransferInput
    const data = await createTransfer(userId, body)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to create transfer')
  }
}

export async function PATCH(request: Request): Promise<Response> {
  try {
    const token = getBearerToken(request)
    const { userId } = await requireAuth(token, 'inventory.manage')

    const body = (await request.json()) as { id?: string } & UpdateTransferInput
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

export async function DELETE(request: Request): Promise<Response> {
  try {
    const token = getBearerToken(request)
    const { userId } = await requireAuth(token, 'inventory.manage')

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
