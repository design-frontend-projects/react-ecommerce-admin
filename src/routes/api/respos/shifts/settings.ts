import { getShiftSettings, updateShiftSettings } from '@/server/fns/shifts'
import { handleRouteError } from '@/server/utils/api-error'
import { getBearerToken, requireAuth } from '@/server/utils/auth'
import { createAPIFileRoute } from '@tanstack/react-start/api'
import { updateShiftSettingsInputSchema } from '@/features/respos/data/shift-schemas'

const GET = async ({ request }: { request: Request }) => {
  try {
    const token = getBearerToken(request)
    await requireAuth(token, 'shifts.use')

    const url = new URL(request.url)
    const data = await getShiftSettings(
      url.searchParams.get('restaurantId'),
      url.searchParams.get('branchId')
    )
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to fetch shift settings')
  }
}

const PUT = async ({ request }: { request: Request }) => {
  try {
    const token = getBearerToken(request)
    const actor = await requireAuth(token, 'shifts.manage')

    const input = updateShiftSettingsInputSchema.parse(await request.json())
    const data = await updateShiftSettings(input, actor)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to update shift settings')
  }
}

export const APIRoute = createAPIFileRoute('/api/respos/shifts/settings')({
  GET,
  PUT,
})
