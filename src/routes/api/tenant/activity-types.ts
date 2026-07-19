import {
  getTenantActivityTypes,
  setTenantActivityTypes,
} from '@/server/fns/activity-types'
import { withAuth } from '@/server/utils/with-auth'
import { jsonError } from '@/server/utils/http'
import { PERMISSIONS } from '@/features/users/data/permission-constants'
import { createAPIFileRoute } from '@tanstack/react-start/api'

const GET = withAuth(null, async ({ auth }) => {
  const data = await getTenantActivityTypes(auth.userId)
  return Response.json({ success: true, data })
})

const PUT = withAuth(
  PERMISSIONS.SETTINGS_MANAGE,
  async ({ request, auth }) => {
    const body = (await request.json()) as { activityTypeCodes?: string[] }
    if (!Array.isArray(body.activityTypeCodes)) {
      return jsonError('activityTypeCodes must be an array.', 400)
    }

    const data = await setTenantActivityTypes(
      auth.userId,
      body.activityTypeCodes
    )
    return Response.json({ success: true, data })
  }
)

export const APIRoute = createAPIFileRoute('/api/tenant/activity-types')({
  GET,
  PUT,
})
