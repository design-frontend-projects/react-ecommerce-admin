import { setRolePermissions } from '@/server/fns/rbac'
import { getBearerToken, requireAuth } from '@/server/utils/auth'
import { jsonError } from '@/server/utils/http'

export async function PUT(request: Request): Promise<Response> {
  try {
    const token = getBearerToken(request)
    await requireAuth(token, 'permissions.manage')

    const body = (await request.json()) as {
      roleId?: string
      permissionIds?: string[]
    }

    if (!body.roleId || !Array.isArray(body.permissionIds)) {
      return jsonError('roleId and permissionIds are required.', 400)
    }

    const role = await setRolePermissions(body.roleId, body.permissionIds)

    return Response.json({
      success: true,
      data: role,
    })
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : 'Unable to update role permissions',
      403
    )
  }
}
