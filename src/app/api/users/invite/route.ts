import { inviteUser } from '@/server/fns/invitations'
import { getBearerToken, requireAuth } from '@/server/utils/auth'
import { jsonError } from '@/server/utils/http'

export async function POST(request: Request): Promise<Response> {
  try {
    const token = getBearerToken(request)
    const authorizedUser = await requireAuth(token, 'users.manage')
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
        inviterAuthUserId: authorizedUser.userId,
      },
    })


    return Response.json({
      success: true,
      data: result,
    })
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Unable to send invitation', 403)
  }
}
