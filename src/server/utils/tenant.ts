import prisma from '@/lib/prisma'

/**
 * Resolve the tenant/account id for an authenticated Supabase user.
 * Mirrors the resolution used by the activity-types server fn:
 * `tenant_users.parent_tenant_id` first, falling back to the user's own
 * `tenant_subscriptions.id`.
 */
export async function resolveTenantId(
  authUserId: string
): Promise<string | null> {
  const tenantUser = (await prisma.tenant_users.findUnique({
    where: { auth_user_id: authUserId },
    select: { parent_tenant_id: true },
  })) as { parent_tenant_id: string | null } | null
  if (tenantUser?.parent_tenant_id) return tenantUser.parent_tenant_id

  const subscription = (await prisma.tenant_subscriptions.findFirst({
    where: { auth_user_id: authUserId },
    select: { id: true },
  })) as { id: string } | null
  return subscription?.id ?? null
}

export async function requireTenantId(authUserId: string): Promise<string> {
  const tenantId = await resolveTenantId(authUserId)
  if (!tenantId) {
    throw new Error('Unable to resolve the caller tenant.')
  }
  return tenantId
}
