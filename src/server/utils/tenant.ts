import prisma from '@/lib/prisma'
import { getOptionalTenantContext } from '@/server/context/tenant-context'

/**
 * Resolve the tenant/account id for an authenticated Supabase user.
 * Prioritizes active AsyncLocalStorage context if present, then falls back
 * to resolving from `tenant_users`, `tenants`, or `tenant_subscriptions`.
 */
export async function resolveTenantId(
  authUserId: string
): Promise<string | null> {
  const currentContext = getOptionalTenantContext()
  if (currentContext?.tenantId) {
    return currentContext.tenantId
  }

  const tenantUser = (await prisma.tenant_users.findFirst({
    where: { auth_user_id: authUserId },
    select: { tenant_id: true, parent_tenant_id: true },
  })) as { tenant_id: string | null; parent_tenant_id: string | null } | null
  if (tenantUser?.tenant_id) return tenantUser.tenant_id
  if (tenantUser?.parent_tenant_id) return tenantUser.parent_tenant_id

  const tenantOwner = prisma.tenants
    ? await prisma.tenants.findFirst({
        where: { auth_user_id: authUserId },
        select: { id: true },
      })
    : null
  if (tenantOwner?.id) return tenantOwner.id

  const subscription = (await prisma.tenant_subscriptions.findFirst({
    where: { auth_user_id: authUserId },
    select: { tenant_id: true, id: true },
  })) as { tenant_id: string | null; id: string } | null
  return subscription?.tenant_id ?? subscription?.id ?? null
}

export async function requireTenantId(authUserId: string): Promise<string> {
  const tenantId = await resolveTenantId(authUserId)
  if (!tenantId) {
    throw new Error('Unable to resolve the caller tenant.')
  }
  return tenantId
}

/**
 * Resolve the tenant user record ID (`tenant_users.id`) for an authenticated Supabase user.
 * Used for audit columns (created_by_user_id, updated_by_user_id).
 */
export async function resolveTenantUserId(
  authUserId: string
): Promise<string | null> {
  const tenantUser = await prisma.tenant_users.findFirst({
    where: { auth_user_id: authUserId },
    select: { id: true },
  })
  return tenantUser?.id ?? null
}

export async function requireTenantUserId(
  authUserId: string
): Promise<string> {
  const userId = await resolveTenantUserId(authUserId)
  if (!userId) {
    throw new Error('Unable to resolve the caller tenant user record.')
  }
  return userId
}

/**
 * @deprecated Data queries should scope by `tenant_id` directly rather than filtering by a set of auth_user_ids.
 */
export async function getTenantAuthUserIds(
  authUserId: string
): Promise<string[]> {
  const authUserIds = new Set<string>([authUserId])

  const tenantId = await resolveTenantId(authUserId)
  if (!tenantId) return [...authUserIds]

  const members = (await prisma.tenant_users.findMany({
    where: {
      OR: [{ tenant_id: tenantId }, { parent_tenant_id: tenantId }],
    },
    select: { auth_user_id: true },
  })) as Array<{ auth_user_id: string | null }>
  for (const member of members) {
    if (member.auth_user_id) {
      authUserIds.add(member.auth_user_id)
    }
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
