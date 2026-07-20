import { createFileRoute } from '@tanstack/react-router'
import { setUserPermissionOverrides } from '@/server/fns/rbac'
import { jsonError } from '@/server/utils/http'
import { withAuth } from '@/server/utils/with-auth'
import prisma from '@/lib/prisma'
import { PERMISSIONS } from '@/features/users/data/permission-constants'

const GET = withAuth(PERMISSIONS.USERS_MANAGE, async ({ request }) => {
  const { searchParams } = new URL(request.url)
  const tenantUserId = searchParams.get('tenantUserId')
  if (!tenantUserId) {
    return jsonError('tenantUserId is required.', 400)
  }

  const overrides = (await prisma.user_permissions.findMany({
    where: { tenant_user_id: tenantUserId },
    select: { permission_id: true, is_granted: true },
  })) as Array<{ permission_id: string; is_granted: boolean }>

  return Response.json({
    success: true,
    data: {
      grants: overrides
        .filter((override) => override.is_granted)
        .map((override) => override.permission_id),
      denies: overrides
        .filter((override) => !override.is_granted)
        .map((override) => override.permission_id),
    },
  })
})

const PUT = withAuth(PERMISSIONS.USERS_MANAGE, async ({ request, auth }) => {
  const body = (await request.json()) as {
    tenantUserId?: string
    grants?: string[]
    denies?: string[]
  }

  if (!body.tenantUserId) {
    return jsonError('tenantUserId is required.', 400)
  }

  const result = await setUserPermissionOverrides(
    body.tenantUserId,
    Array.isArray(body.grants) ? body.grants : [],
    Array.isArray(body.denies) ? body.denies : [],
    auth.userId
  )

  return Response.json({
    success: true,
    data: result,
  })
})

export const Route = createFileRoute('/api/users/permissions')({
  server: {
    handlers: {
      GET,
      PUT,
    },
  },
})
