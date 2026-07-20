import { createFileRoute } from '@tanstack/react-router'
import {
  createPermission,
  deletePermission,
  setRolePermissions,
} from '@/server/fns/rbac'
import { jsonError } from '@/server/utils/http'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'

const PUT = withAuth(
  PERMISSIONS.PERMISSIONS_MANAGE,
  async ({ request, auth }) => {
    const body = (await request.json()) as {
      roleId?: string
      permissionIds?: string[]
    }

    if (!body.roleId || !Array.isArray(body.permissionIds)) {
      return jsonError('roleId and permissionIds are required.', 400)
    }

    const role = await setRolePermissions(
      body.roleId,
      body.permissionIds,
      auth.userId
    )

    return Response.json({
      success: true,
      data: role,
    })
  }
)

const POST = withAuth(PERMISSIONS.PERMISSIONS_MANAGE, async ({ request }) => {
  const body = (await request.json()) as {
    name?: string
    description?: string | null
  }

  if (!body.name) {
    return jsonError('Permission name is required.', 400)
  }

  const permission = await createPermission({
    name: body.name,
    description: body.description,
  })

  return Response.json({
    success: true,
    data: permission,
  })
})

const DELETE = withAuth(PERMISSIONS.PERMISSIONS_MANAGE, async ({ request }) => {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) {
    return jsonError('Permission id is required.', 400)
  }

  await deletePermission(id)

  return Response.json({ success: true })
})

export const Route = createFileRoute('/api/rbac/permissions')({
  server: {
    handlers: {
      POST,
      PUT,
      DELETE,
    },
  },
})
