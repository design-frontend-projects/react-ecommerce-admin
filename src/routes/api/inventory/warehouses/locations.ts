import { createFileRoute } from '@tanstack/react-router'
import {
  createLocation,
  deleteLocation,
  listLocations,
  updateLocation,
  type LocationInput,
} from '@/server/fns/warehouses'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'

const GET = withAuth(PERMISSIONS.INVENTORY_VIEW, async ({ request, auth }) => {
  try {
    const { userId } = auth
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
})

const POST = withAuth(
  PERMISSIONS.INVENTORY_MANAGE,
  async ({ request, auth }) => {
    try {
      const { userId } = auth
      const body = (await request.json()) as LocationInput & {
        warehouseId: string
      }
      const data = await createLocation(userId, body.warehouseId, body)
      return Response.json({ success: true, data })
    } catch (error) {
      return handleRouteError(error, 'Unable to create location')
    }
  }
)

const PATCH = withAuth(
  PERMISSIONS.INVENTORY_MANAGE,
  async ({ request, auth }) => {
    try {
      const { userId } = auth
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
)

export const Route = createFileRoute('/api/inventory/warehouses/locations')({
  server: {
    handlers: {
      GET,
      POST,
      PATCH,
      DELETE,
    },
  },
})
