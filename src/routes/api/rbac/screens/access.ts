import { createFileRoute } from '@tanstack/react-router'
import { setScreenPermissions, setScreenRoles } from '@/server/fns/screens'
import { jsonError } from '@/server/utils/http'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'

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

export const Route = createFileRoute('/api/rbac/screens/access')({
  server: {
    handlers: {
      PUT,
    },
  },
})
