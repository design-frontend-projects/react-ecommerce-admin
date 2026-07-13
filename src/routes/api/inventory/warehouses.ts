import { createAPIFileRoute } from '@tanstack/react-start/api'

import {
  createWarehouse,
  deleteWarehouse,
  listWarehouses,
  updateWarehouse,
  type WarehouseInput,
} from '@/server/fns/warehouses'
import { handleRouteError } from '@/server/utils/api-error'
import { getBearerToken, requireAuth } from '@/server/utils/auth'

const GET = async ({ request }: any) => {
  try {
    const token = getBearerToken(request)
    const { userId } = await requireAuth(token, 'inventory.view')
    const data = await listWarehouses(userId)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to fetch warehouses')
  }
}

const POST = async ({ request }: any) => {
  try {
    const token = getBearerToken(request)
    const { userId } = await requireAuth(token, 'inventory.manage')
    const body = (await request.json()) as WarehouseInput
    const data = await createWarehouse(userId, body)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to create warehouse')
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
        { success: false, error: { message: 'Warehouse id is required.' } },
        { status: 400 }
      )
    }
    const body = (await request.json()) as Partial<WarehouseInput>
    const data = await updateWarehouse(userId, id, body)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to update warehouse')
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
        { success: false, error: { message: 'Warehouse id is required.' } },
        { status: 400 }
      )
    }
    const data = await deleteWarehouse(userId, id)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to delete warehouse')
  }
}

export const APIRoute = createAPIFileRoute('/api/inventory/warehouses')({
  GET,
  POST,
  PATCH,
  DELETE,
})
