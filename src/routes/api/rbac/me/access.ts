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
  let tenantUser: {
    id: string
    onboarding_complete: boolean | null
    parent_tenant_id: string | null
    user_roles: Array<{ role_id: string }>
  } | null = null

  try {
    tenantUser = (await prisma.tenant_users.findFirst({
      where: { auth_user_id: auth.userId },
      select: {
        id: true,
        onboarding_complete: true,
        parent_tenant_id: true,
        user_roles: { select: { role_id: true } },
      },
    })) as {
      id: string
      onboarding_complete: boolean | null
      parent_tenant_id: string | null
      user_roles: Array<{ role_id: string }>
    } | null
  } catch (error) {
    console.warn('[rbac/me/access] Skipping tenant_users DB lookup:', error)
  }

  const isOnboarded =
    tenantUser?.onboarding_complete === true ||
    tenantUser?.parent_tenant_id != null

  // If user profile is not yet fully onboarded, return baseline empty access
  if (tenantUser && !isOnboarded) {
    return Response.json({
      success: true,
      data: {
        authUserId: auth.userId,
        tenantUserId: tenantUser.id,
        roleIds: [],
        roleNames: [],
        permissionNames: [],
        onboardingComplete: false,
      },
    })
  }

  return Response.json({
    success: true,
    data: {
      authUserId: auth.userId,
      tenantUserId: tenantUser?.id ?? null,
      roleIds: tenantUser?.user_roles?.map((row) => row.role_id) ?? [],
      roleNames: auth.roleNames,
      permissionNames: auth.permissionNames,
      onboardingComplete: isOnboarded,
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

