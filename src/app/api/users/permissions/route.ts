import { setUserPermissionOverrides } from '@/server/fns/rbac'
import { getBearerToken, requireAuth } from '@/server/utils/auth'
import { jsonError } from '@/server/utils/http'

export async function PUT(request: Request): Promise<Response> {
  try {
    const token = getBearerToken(request)
    await requireAuth(token, 'users.manage')

    const body = (await request.json()) as {
      tenantUserId?: string
      grants?: string[]
      denies?: string[]
    }

    if (!body.tenantUserId) {
      return jsonError('tenantUserId is required.', 400)
    }

    const result = await setUserPermissionOverrides(
      body.tenantUserId,
      Array.isArray(body.grants) ? body.grants : [],
      Array.isArray(body.denies) ? body.denies : []
    )

    return Response.json({
      success: true,
      data: result,
    })
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : 'Unable to update user permissions',
      403
    )
  }
}
