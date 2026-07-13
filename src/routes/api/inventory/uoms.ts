import { createAPIFileRoute } from '@tanstack/react-start/api'

import {
  createUom,
  deleteUom,
  listUoms,
  updateUom,
  type CreateUomInput,
  type UpdateUomInput,
} from '@/server/fns/uoms'
import { handleRouteError } from '@/server/utils/api-error'
import { getBearerToken, requireAuth } from '@/server/utils/auth'

const GET = async ({ request }: any) => {
  try {
    const token = getBearerToken(request)
    const { userId } = await requireAuth(token, 'inventory.view')
    const data = await listUoms(userId)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to fetch units of measure')
  }
}

const POST = async ({ request }: any) => {
  try {
    const token = getBearerToken(request)
    const { userId } = await requireAuth(token, 'inventory.manage')
    const body = (await request.json()) as CreateUomInput
    const data = await createUom(userId, body)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to create unit of measure')
  }
}

const PATCH = async ({ request }: any) => {
  try {
    const token = getBearerToken(request)
    const { userId } = await requireAuth(token, 'inventory.manage')
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return Response.json(
        { success: false, error: { message: 'Unit id is required.' } },
        { status: 400 }
      )
    }
    const body = (await request.json()) as UpdateUomInput
    const data = await updateUom(userId, id, body)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to update unit of measure')
  }
}

const DELETE = async ({ request }: any) => {
  try {
    const token = getBearerToken(request)
    const { userId } = await requireAuth(token, 'inventory.manage')
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return Response.json(
        { success: false, error: { message: 'Unit id is required.' } },
        { status: 400 }
      )
    }
    const data = await deleteUom(userId, id)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to delete unit of measure')
  }
}

export const APIRoute = createAPIFileRoute('/api/inventory/uoms')({
  GET,
  POST,
  PATCH,
  DELETE,
})
