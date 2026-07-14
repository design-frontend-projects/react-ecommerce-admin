import {
  createLocation,
  deleteLocation,
  listLocations,
  updateLocation,
  type LocationInput,
} from '@/server/fns/warehouses'
import { handleRouteError } from '@/server/utils/api-error'
import { getBearerToken, requireAuth } from '@/server/utils/auth'
import { createAPIFileRoute } from '@tanstack/react-start/api'

const GET = async ({ request }: any) => {
  try {
    const token = getBearerToken(request)
    const { userId } = await requireAuth(token, 'inventory.view')
    const { searchParams } = new URL(request.url)
    const warehouseId = searchParams.get('warehouseId')
    if (!warehouseId) {
      return Response.json(
        { success: false, error: { message: 'warehouseId is required.' } },
        { status: 400 }
      )
    }
    const data = await listLocations(userId, warehouseId)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to fetch locations')
  }
}

const POST = async ({ request }: any) => {
  try {
    const token = getBearerToken(request)
    const { userId } = await requireAuth(token, 'inventory.manage')
    const body = (await request.json()) as LocationInput & {
      warehouseId: string
    }
    const data = await createLocation(userId, body.warehouseId, body)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to create location')
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
        { success: false, error: { message: 'Location id is required.' } },
        { status: 400 }
      )
    }
    const body = (await request.json()) as Partial<LocationInput>
    const data = await updateLocation(userId, id, body)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to update location')
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
        { success: false, error: { message: 'Location id is required.' } },
        { status: 400 }
      )
    }
    const data = await deleteLocation(userId, id)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to delete location')
  }
}

export const APIRoute = createAPIFileRoute(
  '/api/inventory/warehouses/locations'
)({
  GET,
  POST,
  PATCH,
  DELETE,
})
