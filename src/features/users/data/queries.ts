import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createRealtimeChannel, supabase } from '@/lib/supabase-service'
import { supabase as authClient } from '@/lib/supabase'
import { authorizedRequest } from '@/lib/api-client'
import type { CurrentUserAccess } from './types'

export const currentAccessQueryKey = (authUserId: string | null | undefined) =>
  ['rbac', 'current-access', authUserId] as const

/**
 * Resolve the current user's effective access from the authoritative server resolver
 * (`GET /api/rbac/me/access`), which applies `user_permissions` grant/deny overrides exactly
 * like `requireAuth`. This replaces the former direct-Supabase, role-only path so the sidebar
 * and route guards never diverge from the server (spec Q5).
 */
export async function fetchCurrentUserAccess(
  authUserId: string
): Promise<CurrentUserAccess | null> {
  const { data } = await authClient.auth.getSession()
  const token = data.session?.access_token
  if (!token) return null

  const payload = (await authorizedRequest(
    async () => token,
    '/api/rbac/me/access'
  )) as { data?: CurrentUserAccess } | undefined
  const access = payload?.data
  if (!access) return null

  return {
    authUserId: access.authUserId ?? authUserId,
    tenantUserId: access.tenantUserId ?? null,
    roleIds: access.roleIds ?? [],
    roleNames: access.roleNames ?? [],
    permissionNames: access.permissionNames ?? [],
  }
}


export function useCurrentUserAccess(
  authUserId: string | null | undefined,
  onRealtimeEvent?: () => void
) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: currentAccessQueryKey(authUserId),
    queryFn: () => fetchCurrentUserAccess(authUserId!),
    enabled: Boolean(authUserId),
    staleTime: 60_000,
  })
  const roleIdsKey = (query.data?.roleIds ?? []).join(',')
  const tenantUserId = query.data?.tenantUserId ?? null

  useEffect(() => {
    if (!authUserId) {
      return undefined
    }

    const invalidate = () => {
      onRealtimeEvent?.()
      void queryClient.invalidateQueries({
        queryKey: currentAccessQueryKey(authUserId),
      })
      // DB-driven navigation shares the same inputs (roles/permissions);
      // reshape the sidebar and route guard on the same events.
      void queryClient.invalidateQueries({ queryKey: ['access-navigation'] })
    }

    const channels = [
      createRealtimeChannel(`rbac-profiles-${authUserId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'profiles',
            filter: `auth_user_id=eq.${authUserId}`,
          },
          invalidate
        )
        .subscribe(),
      createRealtimeChannel(`rbac-user-roles-${authUserId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_roles',
            filter: `auth_user_id=eq.${authUserId}`,
          },
          invalidate
        )
        .subscribe(),
      createRealtimeChannel(`rbac-tenant-user-${authUserId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tenant_users',
            filter: `auth_user_id=eq.${authUserId}`,
          },
          invalidate
        )
        .subscribe(),
    ]

    for (const roleId of query.data?.roleIds ?? []) {
      channels.push(
        createRealtimeChannel(`rbac-role-permissions-${roleId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'role_permissions',
              filter: `role_id=eq.${roleId}`,
            },
            invalidate
          )
          .subscribe()
      )
    }

    // Per-user overrides: keep effective access live when an admin grants/denies a
    // permission directly on this user (spec Q5 convergence).
    if (tenantUserId) {
      channels.push(
        createRealtimeChannel(`rbac-user-permissions-${tenantUserId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'user_permissions',
              filter: `tenant_user_id=eq.${tenantUserId}`,
            },
            invalidate
          )
          .subscribe()
      )
    }

    return () => {
      for (const channel of channels) {
        void supabase.removeChannel(channel)
      }
    }
  }, [authUserId, onRealtimeEvent, queryClient, roleIdsKey, tenantUserId])

  return query
}
