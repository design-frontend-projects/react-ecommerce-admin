import { createFileRoute } from '@tanstack/react-router'
import {
  createConversion,
  deleteConversion,
  listConversions,
  type CreateConversionInput,
} from '@/server/fns/uoms'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'

const GET = withAuth(PERMISSIONS.INVENTORY_VIEW, async ({ auth }) => {
  try {
    const { userId } = auth
    const data = await listConversions(userId)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to fetch unit conversions')
  }
})

const POST = withAuth(
  PERMISSIONS.INVENTORY_MANAGE,
  async ({ request, auth }) => {
    try {
      const { userId } = auth
      const body = (await request.json()) as CreateConversionInput
      const data = await createConversion(userId, body)
      return Response.json({ success: true, data })
    } catch (error) {
      return handleRouteError(error, 'Unable to create unit conversion')
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
          { success: false, error: { message: 'Conversion id is required.' } },
          { status: 400 }
        )
      }
      const data = await deleteConversion(userId, id)
      return Response.json({ success: true, data })
    } catch (error) {
      return handleRouteError(error, 'Unable to delete unit conversion')
    }
  }
)

export const Route = createFileRoute('/api/inventory/uoms/conversions')({
  server: {
    handlers: {
      GET,
      POST,
      DELETE,
    },
  },
})
