import { createFileRoute } from '@tanstack/react-router'
import {
  createLookupValue,
  deleteLookupValue,
  listLookupValues,
  reorderLookupValues,
  toggleLookupValueActive,
  updateLookupValue,
  type CreateLookupValueInput,
  type UpdateLookupValueInput,
} from '@/server/fns/lookups'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'

const GET = withAuth(PERMISSIONS.INVENTORY_VIEW, async ({ request, auth }) => {
  try {
    const { userId } = auth
    const { searchParams } = new URL(request.url)
    const typeCode = searchParams.get('type')
    const includeInactive = searchParams.get('includeInactive') === 'true'

    if (!typeCode) {
      return Response.json(
        { success: false, error: { message: 'Lookup type is required.' } },
        { status: 400 }
      )
    }

    const data = await listLookupValues(userId, typeCode, includeInactive)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to fetch lookup values')
  }
})

const POST = withAuth(PERMISSIONS.INVENTORY_MANAGE, async ({ request, auth }) => {
  try {
    const { userId } = auth
    const { searchParams } = new URL(request.url)
    const typeCode = searchParams.get('type')

    if (!typeCode) {
      return Response.json(
        { success: false, error: { message: 'Lookup type is required.' } },
        { status: 400 }
      )
    }

    const body = (await request.json()) as CreateLookupValueInput
    const data = await createLookupValue(userId, typeCode, body)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to create lookup value')
  }
})

const PATCH = withAuth(PERMISSIONS.INVENTORY_MANAGE, async ({ request, auth }) => {
  try {
    const { userId } = auth
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const action = searchParams.get('action')

    if (!id) {
      return Response.json(
        { success: false, error: { message: 'Lookup value id is required.' } },
        { status: 400 }
      )
    }

    if (action === 'toggle') {
      const data = await toggleLookupValueActive(userId, id)
      return Response.json({ success: true, data })
    }

    const body = (await request.json()) as UpdateLookupValueInput
    const data = await updateLookupValue(userId, id, body)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to update lookup value')
  }
})

const PUT = withAuth(PERMISSIONS.INVENTORY_MANAGE, async ({ request, auth }) => {
  try {
    const { userId } = auth
    const { searchParams } = new URL(request.url)
    const typeCode = searchParams.get('type')

    if (!typeCode) {
      return Response.json(
        { success: false, error: { message: 'Lookup type is required.' } },
        { status: 400 }
      )
    }

    const body = (await request.json()) as { orderedIds: string[] }
    const data = await reorderLookupValues(userId, typeCode, body.orderedIds || [])
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to reorder lookup values')
  }
})

const DELETE = withAuth(PERMISSIONS.INVENTORY_MANAGE, async ({ request, auth }) => {
  try {
    const { userId } = auth
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return Response.json(
        { success: false, error: { message: 'Lookup value id is required.' } },
        { status: 400 }
      )
    }

    const data = await deleteLookupValue(userId, id)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to delete lookup value')
  }
})

export const Route = createFileRoute('/api/lookups/values')({
  server: {
    handlers: {
      GET,
      POST,
      PATCH,
      PUT,
      DELETE,
    },
  },
})
