import { setScreenPermissions, setScreenRoles } from '@/server/fns/screens'
import { getBearerToken, requireAuth } from '@/server/utils/auth'
import { jsonError } from '@/server/utils/http'
import { createAPIFileRoute } from '@tanstack/react-start/api'

const PUT = async ({ request, params }: any) => {
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

    await setScreenRoles(
      body.screenId,
      Array.isArray(body.roleIds) ? body.roleIds : []
    )
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

export const APIRoute = createAPIFileRoute('/api/rbac/screens/access')({
  PUT,
})
