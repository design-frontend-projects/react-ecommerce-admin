import { createFileRoute } from '@tanstack/react-router'
import { withAuth } from '@/server/utils/with-auth'
import prisma from '@/lib/prisma'

/**
 * Current-user access, computed by the authoritative server resolver (including
 * `user_permissions` overrides). The client consumes this instead of the
 * direct-Supabase, role-only path so the sidebar and route guards match
 * `requireAuth` exactly (spec Q5).
 */
const GET = withAuth(null, async ({ auth }) => {
  const tenantUser = (await prisma.tenant_users.findUnique({
    where: { auth_user_id: auth.userId },
    select: { id: true, user_roles: { select: { role_id: true } } },
  })) as { id: string; user_roles: Array<{ role_id: string }> } | null

  return Response.json({
    success: true,
    data: {
      authUserId: auth.userId,
      tenantUserId: tenantUser?.id ?? null,
      roleIds: tenantUser?.user_roles.map((row) => row.role_id) ?? [],
      roleNames: auth.roleNames,
      permissionNames: auth.permissionNames,
    },
  })
})

export const Route = createFileRoute('/api/rbac/me/access')({
  server: {
    handlers: {
      GET,
    },
  },
})
