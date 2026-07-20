import { createFileRoute } from '@tanstack/react-router'
import {
  createRole,
  deleteRole,
  getRolesPermissions,
  updateRole,
} from '@/server/fns/rbac'
import { jsonError } from '@/server/utils/http'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'

const GET = withAuth(PERMISSIONS.USERS_VIEW, async () => {
  const payload = await getRolesPermissions()
  return Response.json({
    success: true,
    data: payload,
  })
})

const POST = withAuth(PERMISSIONS.ROLES_MANAGE, async ({ request, auth }) => {
  const body = (await request.json()) as {
    name?: string
    description?: string
    permissionIds?: string[]
  }

  if (!body.name) {
    return jsonError('Role name is required.', 400)
  }

  const role = await createRole({
    name: body.name,
    description: body.description,
    permissionIds: body.permissionIds,
    callerAuthUserId: auth.userId,
  })

  return Response.json({
    success: true,
    data: role,
  })
})

const PATCH = withAuth(PERMISSIONS.ROLES_MANAGE, async ({ request, auth }) => {
  const body = (await request.json()) as {
    id?: string
    name?: string
    description?: string | null
    is_active?: boolean
  }

  if (!body.id) {
    return jsonError('Role id is required.', 400)
  }

  const role = await updateRole({
    id: body.id,
    name: body.name,
    description: body.description ?? undefined,
    is_active: body.is_active,
    callerAuthUserId: auth.userId,
  })

  return Response.json({
    success: true,
    data: role,
  })
})

const DELETE = withAuth(PERMISSIONS.ROLES_MANAGE, async ({ request, auth }) => {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return jsonError('Role id is required.', 400)
  }

  await deleteRole(id, auth.userId)

  return Response.json({
    success: true,
  })
})

export const Route = createFileRoute('/api/rbac')({
  server: {
    handlers: {
      GET,
      POST,
      PATCH,
      DELETE,
    },
  },
})
