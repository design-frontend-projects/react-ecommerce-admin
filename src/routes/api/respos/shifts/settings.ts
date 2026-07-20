import { createFileRoute } from '@tanstack/react-router'
import { getShiftSettings, updateShiftSettings } from '@/server/fns/shifts'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { updateShiftSettingsInputSchema } from '@/features/respos/data/shift-schemas'
import { PERMISSIONS } from '@/features/users/data/permission-constants'

const GET = withAuth(PERMISSIONS.SHIFTS_USE, async ({ request }) => {
  try {
    const url = new URL(request.url)
    const data = await getShiftSettings(
      url.searchParams.get('restaurantId'),
      url.searchParams.get('branchId')
    )
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to fetch shift settings')
  }
})

const PUT = withAuth(PERMISSIONS.SHIFTS_MANAGE, async ({ request, auth }) => {
  try {
    const input = updateShiftSettingsInputSchema.parse(await request.json())
    const data = await updateShiftSettings(input, auth)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to update shift settings')
  }
})

export const Route = createFileRoute('/api/respos/shifts/settings')({
  server: {
    handlers: {
      GET,
      PUT,
    },
  },
})
