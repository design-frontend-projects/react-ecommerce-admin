import { createUser } from '@/server/fns/create-user'
import { getUsers } from '@/server/fns/users'
import { withAuth } from '@/server/utils/with-auth'
import { jsonError } from '@/server/utils/http'
import { PERMISSIONS } from '@/features/users/data/permission-constants'
import { createAPIFileRoute } from '@tanstack/react-start/api'

const GET = withAuth(PERMISSIONS.USERS_VIEW, async ({ auth }) => {
  const users = await getUsers(auth.userId)
  return Response.json({
    success: true,
    data: users,
  })
})

const POST = withAuth(PERMISSIONS.USERS_MANAGE, async ({ request, auth }) => {
  const body = (await request.json()) as {
    email?: string
    firstName?: string
    lastName?: string
    phone?: string
    roleIds?: string[]
    branchId?: string
    overrides?: Array<{ permissionId?: string; isGranted?: boolean }>
  }

  // No password field — the server generates a temporary one and returns it once.
  if (!body.email) {
    return jsonError('Email is required.', 400)
  }
  if (!Array.isArray(body.roleIds) || body.roleIds.length === 0) {
    return jsonError('At least one role is required.', 400)
  }

  const overrides = Array.isArray(body.overrides)
    ? body.overrides
        .filter((entry) => typeof entry?.permissionId === 'string')
        .map((entry) => ({
          permissionId: entry.permissionId as string,
          isGranted: entry.isGranted === true,
        }))
    : undefined

  try {
    const result = await createUser(
      {
        email: body.email,
        firstName: body.firstName,
        lastName: body.lastName,
        phone: body.phone,
        roleIds: body.roleIds,
        branchId: body.branchId,
        overrides,
      },
      { authUserId: auth.userId }
    )

    return Response.json({
      success: true,
      data: result,
    })
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : 'Unable to create user',
      400
    )
  }
})

export const APIRoute = createAPIFileRoute('/api/users')({
  GET,
  POST,
})
