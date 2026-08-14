import { createFileRoute } from '@tanstack/react-router'
import { ensureAccessControlSeeded } from '@/server/fns/access-control-seed'
import { withAuth } from '@/server/utils/with-auth'
import { resolveUserDynamicNavigation } from '@/server/services/navigation-abac.service'

/**
 * Navigation catalog for the signed-in user: active modules and screens from
 * the access-control catalog, with per-screen visibility resolved
 * SERVER-SIDE against the caller's roles/permissions (RBAC) and tenant
 * activities/module assignments (ABAC).
 */
const GET = withAuth(null, async ({ auth, getTenantId }) => {
  await ensureAccessControlSeeded()

  const tenantId = await getTenantId()

  const data = await resolveUserDynamicNavigation({
    authUserId: auth.userId,
    roleNames: auth.roleNames,
    permissionNames: auth.permissionNames,
    tenantId,
  })

  return Response.json({
    success: true,
    data,
  })
})

export const Route = createFileRoute('/api/access-control/navigation')({
  server: {
    handlers: {
      GET,
    },
  },
})

