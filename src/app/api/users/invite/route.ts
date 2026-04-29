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
      roleName?: string
    }

    if (!body.email || !body.roleId) {
      return jsonError('Email and role are required.', 400)
    }

    const result = await inviteUser({
      email: body.email,
      roleId: body.roleId,
      roleName: body.roleName,
      redirectUrl: new URL('/sign-up', request.url).toString(),
      inviterClerkUserId: authorizedUser.userId,
    })

    return Response.json({
      success: true,
      data: result,
    })
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Unable to send invitation', 403)
  }
}
