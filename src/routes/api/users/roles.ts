import { createFileRoute } from '@tanstack/react-router'
import { updateUserRoles } from '@/server/fns/rbac'
import { jsonError } from '@/server/utils/http'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'

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

export const Route = createFileRoute('/api/users/roles')({
  server: {
    handlers: {
      POST,
    },
  },
})
