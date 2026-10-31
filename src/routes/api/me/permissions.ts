/**
 * src/routes/api/me/permissions.ts
 *
 * REST endpoint returning the current user's effective permissions,
 * ABAC scopes, accessible modules, screens, and action button states.
 */

import { createFileRoute } from '@tanstack/react-router'
import { withAuth } from '@/server/utils/with-auth'
import { getMePermissions } from '@/server/fns/me-permissions'

const GET = withAuth(null, async ({ auth, request, tenantId }) => {
  const effectiveTenantId =
    request.headers.get('x-tenant-id')?.trim() ||
    tenantId ||
    auth.tenantId ||
    null

  const result = await getMePermissions({
    authUserId: auth.userId,
    tenantId: effectiveTenantId,
  })

  return Response.json(result)
})

export const Route = createFileRoute('/api/me/permissions')({
  server: {
    handlers: {
      GET,
    },
  },
})
