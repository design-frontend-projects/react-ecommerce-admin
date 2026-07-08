import { setScreenPermissions, setScreenRoles } from '@/server/fns/screens'
import { getBearerToken, requireAuth } from '@/server/utils/auth'
import { jsonError } from '@/server/utils/http'

export async function PUT(request: Request): Promise<Response> {
  try {
    const token = getBearerToken(request)
    await requireAuth(token, 'screens.manage')

    const body = (await request.json()) as {
      screenId?: string
      roleIds?: string[]
      permissionIds?: string[]
    }

    if (!body.screenId) {
      return jsonError('screenId is required.', 400)
    }

    await setScreenRoles(body.screenId, Array.isArray(body.roleIds) ? body.roleIds : [])
    await setScreenPermissions(
      body.screenId,
      Array.isArray(body.permissionIds) ? body.permissionIds : []
    )

    return Response.json({ success: true })
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : 'Unable to update screen access',
      403
    )
  }
}
