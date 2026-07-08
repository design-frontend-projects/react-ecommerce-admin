import {
  getTenantActivityTypes,
  setTenantActivityTypes,
} from '@/server/fns/activity-types'
import { getBearerToken, requireAuth } from '@/server/utils/auth'
import { jsonError } from '@/server/utils/http'

export async function GET(request: Request): Promise<Response> {
  try {
    const token = getBearerToken(request)
    const authorizedUser = await requireAuth(token)

    const data = await getTenantActivityTypes(authorizedUser.userId)
    return Response.json({ success: true, data })
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : 'Unable to fetch activity types',
      403
    )
  }
}

export async function PUT(request: Request): Promise<Response> {
  try {
    const token = getBearerToken(request)
    const authorizedUser = await requireAuth(token, 'settings.manage')

    const body = (await request.json()) as { activityTypeCodes?: string[] }
    if (!Array.isArray(body.activityTypeCodes)) {
      return jsonError('activityTypeCodes must be an array.', 400)
    }

    const data = await setTenantActivityTypes(
      authorizedUser.userId,
      body.activityTypeCodes
    )
    return Response.json({ success: true, data })
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : 'Unable to update activity types',
      403
    )
  }
}
