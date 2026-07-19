import { setScreenPermissions, setScreenRoles } from '@/server/fns/screens'
import { withAuth } from '@/server/utils/with-auth'
import { jsonError } from '@/server/utils/http'
import { PERMISSIONS } from '@/features/users/data/permission-constants'
import { createAPIFileRoute } from '@tanstack/react-start/api'

const PUT = withAuth(PERMISSIONS.SCREENS_MANAGE, async ({ request }) => {
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
})

export const APIRoute = createAPIFileRoute('/api/rbac/screens/access')({
  PUT,
})
