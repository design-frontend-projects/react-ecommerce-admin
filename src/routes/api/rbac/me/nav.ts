import { createFileRoute } from '@tanstack/react-router'
import { getNavCatalog } from '@/server/fns/screens'
import { withAuth } from '@/server/utils/with-auth'
import prisma from '@/lib/prisma'

/**
 * Navigation catalog for the current user. Auth-only (no specific permission)
 * because it describes the user's own nav; the client filters screens against
 * the user's resolved access. Falls back to the static sidebar array when this
 * returns nothing.
 */
const GET = withAuth(null, async ({ auth }) => {
  // If user has not completed onboarding and is not a staff member,
  // return empty modules instead of running full catalog seed/query
  try {
    const tenantUser = (await prisma.tenant_users.findFirst({
      where: { auth_user_id: auth.userId },
      select: { onboarding_complete: true, parent_tenant_id: true },
    })) as { onboarding_complete: boolean | null; parent_tenant_id: string | null } | null

    const isOnboarded =
      tenantUser?.onboarding_complete === true ||
      tenantUser?.parent_tenant_id != null

    if (tenantUser && !isOnboarded) {
      return Response.json({
        success: true,
        data: { modules: [] },
      })
    }
  } catch (error) {
    console.warn('[rbac/me/nav] Skipping onboarding check:', error)
  }

  const data = await getNavCatalog()
  return Response.json({ success: true, data })
})

export const Route = createFileRoute('/api/rbac/me/nav')({
  server: {
    handlers: {
      GET,
    },
  },
})

