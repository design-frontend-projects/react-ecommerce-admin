import { createFileRoute } from '@tanstack/react-router'
import { inviteUser } from '@/server/fns/invitations'
import { getBearerToken } from '@/server/utils/auth'
import { jsonError } from '@/server/utils/http'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'

const POST = withAuth(PERMISSIONS.USERS_MANAGE, async ({ request }) => {
  const token = getBearerToken(request)
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

  try {
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
})

export const Route = createFileRoute('/api/users/invite')({
  server: {
    handlers: {
      POST,
    },
  },
})
