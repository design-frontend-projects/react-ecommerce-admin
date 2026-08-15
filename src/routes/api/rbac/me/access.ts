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
  let tenantUser: { id: string; user_roles: Array<{ role_id: string }> } | null = null
  try {
    tenantUser = (await prisma.tenant_users.findFirst({
      where: { auth_user_id: auth.userId },
      select: { id: true, user_roles: { select: { role_id: true } } },
    })) as { id: string; user_roles: Array<{ role_id: string }> } | null
  } catch (error) {
    console.warn('[rbac/me/access] Skipping tenant_users DB lookup:', error)
  }

  return Response.json({
    success: true,
    data: {
      authUserId: auth.userId,
      tenantUserId: tenantUser?.id ?? null,
      roleIds: tenantUser?.user_roles?.map((row) => row.role_id) ?? [],
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
