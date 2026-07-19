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

/**
 * Collect every auth user id belonging to the caller's tenant (members plus
 * the owning account), for scoping queries on tables keyed by `auth_user_id`.
 * Always includes the caller so a user without a tenant row is limited to
 * their own records.
 */
export async function getTenantAuthUserIds(
  authUserId: string
): Promise<string[]> {
  const authUserIds = new Set<string>([authUserId])

  const tenantId = await resolveTenantId(authUserId)
  if (!tenantId) return [...authUserIds]

  const members = (await prisma.tenant_users.findMany({
    where: { parent_tenant_id: tenantId },
    select: { auth_user_id: true },
  })) as Array<{ auth_user_id: string }>
  for (const member of members) {
    authUserIds.add(member.auth_user_id)
  }

  // The tenant id may reference either the owner profile or the owner's
  // subscription row (see resolveTenantId) — include the owner either way.
  const ownerProfile = (await prisma.profiles.findFirst({
    where: { id: tenantId },
    select: { auth_user_id: true },
  })) as { auth_user_id: string | null } | null
  if (ownerProfile?.auth_user_id) {
    authUserIds.add(ownerProfile.auth_user_id)
  }

  const ownerSubscription = (await prisma.tenant_subscriptions.findFirst({
    where: { id: tenantId },
    select: { auth_user_id: true },
  })) as { auth_user_id: string | null } | null
  if (ownerSubscription?.auth_user_id) {
    authUserIds.add(ownerSubscription.auth_user_id)
  }

  return [...authUserIds]
}
