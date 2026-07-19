import { createUser } from '@/server/fns/create-user'
import { getUsers } from '@/server/fns/users'
import { getBearerToken, requireAuth } from '@/server/utils/auth'
import { jsonError } from '@/server/utils/http'
import { createAPIFileRoute } from '@tanstack/react-start/api'

const GET = async ({ request, params }: any) => {
  try {
    const token = getBearerToken(request)
    const authorizedUser = await requireAuth(token, 'users.view')

    const users = await getUsers(authorizedUser.userId)
    return Response.json({
      success: true,
      data: users,
    })
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : 'Unable to fetch users',
      403
    )
  }
}

const POST = async ({ request, params }: any) => {
  try {
    const token = getBearerToken(request)
    const authorizedUser = await requireAuth(token, 'users.manage')

    const body = (await request.json()) as {
      email?: string
      password?: string
      firstName?: string
      lastName?: string
      phone?: string
      roleIds?: string[]
      branchId?: string
    }

    if (!body.email || !body.password) {
      return jsonError('Email and password are required.', 400)
    }
    if (!Array.isArray(body.roleIds) || body.roleIds.length === 0) {
      return jsonError('At least one role is required.', 400)
    }

    const result = await createUser(
      {
        email: body.email,
        password: body.password,
        firstName: body.firstName,
        lastName: body.lastName,
        phone: body.phone,
        roleIds: body.roleIds,
        branchId: body.branchId,
      },
      { authUserId: authorizedUser.userId }
    )

    return Response.json({
      success: true,
      data: result,
    })
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : 'Unable to create user',
      403
    )
  }
}

export const APIRoute = createAPIFileRoute('/api/users')({
  GET,
  POST,
})
