import { inviteUser } from '@/server/fns/invitations'
import { getBearerToken, requireAuth } from '@/server/utils/auth'
import { jsonError } from '@/server/utils/http'
import { createAPIFileRoute } from '@tanstack/react-start/api'

const POST = async ({ request, params }: any) => {
  try {
    const token = getBearerToken(request)
    await requireAuth(token, 'users.manage')
    const body = (await request.json()) as {
      email?: string
      roleId?: string
      roleIds?: string[]
      roleName?: string
      branchId?: string
    }

    const roleIds = Array.isArray(body.roleIds) ? body.roleIds : undefined
    const primaryRoleId = body.roleId ?? roleIds?.[0]

    if (!body.email || !primaryRoleId) {
      return jsonError('Email and at least one role are required.', 400)
    }

    const result = await inviteUser({
      data: {
        email: body.email,
        roleId: primaryRoleId,
        roleIds,
        roleName: body.roleName,
        branchId: body.branchId,
        redirectUrl: new URL('/auth/callback', request.url).toString(),
        sessionToken: token,
      },
    })

    return Response.json({
      success: true,
      data: result,
    })
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : 'Unable to send invitation',
      403
    )
  }
}

export const APIRoute = createAPIFileRoute('/api/users/invite')({
  POST,
})
