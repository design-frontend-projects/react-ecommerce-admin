import { createAPIFileRoute } from '@tanstack/react-start/api'

import { updateUserRoles } from '@/server/fns/rbac'
import { getBearerToken, requireAuth } from '@/server/utils/auth'
import { jsonError } from '@/server/utils/http'

const POST = async ({ request, params }: any) => {
  try {
    const token = getBearerToken(request)
    const authorizedUser = await requireAuth(token, 'users.manage')
    const body = (await request.json()) as {
      userId?: string
      roleIds?: string[]
    }

    if (!body.userId || !Array.isArray(body.roleIds)) {
      return jsonError('userId and roleIds are required.', 400)
    }

    await updateUserRoles(body.userId, body.roleIds, authorizedUser.userId)

    return Response.json({
      success: true,
    })
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : 'Unable to update user roles',
      403
    )
  }
}


export const APIRoute = createAPIFileRoute('/api/users/roles')({
  POST,
})
