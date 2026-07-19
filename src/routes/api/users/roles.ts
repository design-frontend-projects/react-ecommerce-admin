import { updateUserRoles } from '@/server/fns/rbac'
import { withAuth } from '@/server/utils/with-auth'
import { jsonError } from '@/server/utils/http'
import { PERMISSIONS } from '@/features/users/data/permission-constants'
import { createAPIFileRoute } from '@tanstack/react-start/api'

const POST = withAuth(PERMISSIONS.USERS_MANAGE, async ({ request, auth }) => {
  const body = (await request.json()) as {
    userId?: string
    roleIds?: string[]
  }

  if (!body.userId || !Array.isArray(body.roleIds)) {
    return jsonError('userId and roleIds are required.', 400)
  }

  await updateUserRoles(body.userId, body.roleIds, auth.userId)

  return Response.json({
    success: true,
  })
})

export const APIRoute = createAPIFileRoute('/api/users/roles')({
  POST,
})
