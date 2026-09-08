import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isValidUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value)
}

export function getAuthTenantAndUser() {
  const { user, profile } = useAuthStore.getState().auth
  const rawTenantId =
    profile?.tenant_id ||
    profile?.parent_tenant_id ||
    (user?.app_metadata as Record<string, unknown> | undefined)?.tenant_id ||
    (user?.user_metadata as Record<string, unknown> | undefined)?.tenant_id ||
    null

  const rawUserId = profile?.id || profile?.auth_user_id || user?.id || null

  return {
    tenantId: isValidUuid(rawTenantId) ? String(rawTenantId) : null,
    userId: isValidUuid(rawUserId) ? String(rawUserId) : null,
  }
}

/**
 * Resolves the tenant_id for client-side operations.
 * Prioritizes explicit argument, then active user/profile in useAuthStore,
 * then queries tenant_users / tenants / tenant_subscriptions via Supabase.
 */
export async function resolveClientTenantId(
  explicitTenantId?: string | null
): Promise<string | null> {
  if (explicitTenantId && isValidUuid(explicitTenantId)) {
    return explicitTenantId
  }

  const { tenantId } = getAuthTenantAndUser()
  if (tenantId && isValidUuid(tenantId)) {
    return tenantId
  }

  // 1. Check supabase current auth session user
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user?.id) {
      const metaTenant =
        (user.app_metadata as Record<string, unknown> | undefined)?.tenant_id ||
        (user.user_metadata as Record<string, unknown> | undefined)?.tenant_id
      if (metaTenant && isValidUuid(metaTenant)) {
        return String(metaTenant)
      }

      // 2. Query tenant_users for this auth user
      const { data: tu } = await supabase
        .from('tenant_users')
        .select('id, tenant_id, parent_tenant_id')
        .eq('auth_user_id', user.id)
        .maybeSingle()

      const resolved = tu?.tenant_id || tu?.parent_tenant_id
      if (resolved && isValidUuid(resolved)) {
        const currentProfile = useAuthStore.getState().auth.profile
        if (currentProfile && !currentProfile.tenant_id) {
          useAuthStore.getState().auth.setProfile({
            ...currentProfile,
            tenant_id: String(resolved),
          })
        }
        return String(resolved)
      }

      // 3. Query tenants owned by user
      const { data: ownerTenant } = await supabase
        .from('tenants')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle()
      if (ownerTenant?.id && isValidUuid(ownerTenant.id)) {
        return String(ownerTenant.id)
      }

      // 4. Query tenant_subscriptions
      const { data: sub } = await supabase
        .from('tenant_subscriptions')
        .select('tenant_id, id')
        .eq('auth_user_id', user.id)
        .maybeSingle()
      const subTenantId = sub?.tenant_id || sub?.id
      if (subTenantId && isValidUuid(subTenantId)) {
        return String(subTenantId)
      }
    }

    // 5. Fallback for single-tenant / local development
    const { data: defaultTenant } = await supabase
      .from('tenants')
      .select('id')
      .limit(1)
      .maybeSingle()
    if (defaultTenant?.id && isValidUuid(defaultTenant.id)) {
      return String(defaultTenant.id)
    }
  } catch {
    // Fail safely if network or supabase call errors
  }

  return null
}
