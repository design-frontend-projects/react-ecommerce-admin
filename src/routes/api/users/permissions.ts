import { setUserPermissionOverrides } from '@/server/fns/rbac'
import { withAuth } from '@/server/utils/with-auth'
import { jsonError } from '@/server/utils/http'
import { PERMISSIONS } from '@/features/users/data/permission-constants'
import { createAPIFileRoute } from '@tanstack/react-start/api'

const PUT = withAuth(PERMISSIONS.USERS_MANAGE, async ({ request, auth }) => {
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
    Array.isArray(body.denies) ? body.denies : [],
    auth.userId
  )

  return Response.json({
    success: true,
    data: result,
  })
})

export const APIRoute = createAPIFileRoute('/api/users/permissions')({
  PUT,
})
