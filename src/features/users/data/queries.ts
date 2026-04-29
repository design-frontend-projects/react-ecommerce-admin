import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createRealtimeChannel, supabase } from '@/lib/supabase-service'
import {
  expandPermissionNames,
  permissionNamesFromRoles,
} from './rbac'
import type { CurrentUserAccess, RoleWithPermissions } from './types'

type TenantUserAccessRow = {
  clerk_user_id: string
  user_roles: Array<{
    role_id: string
    roles: {
      id: string
      name: string
      description?: string | null
      is_active?: boolean
      created_at?: string | null
      updated_at?: string | null
      role_permissions: Array<{
        permissions: {
          id: string
          name: string
          description?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }>
    } | null
  }>
} | null

export const currentAccessQueryKey = (clerkUserId: string | null | undefined) =>
  ['rbac', 'current-access', clerkUserId] as const

function normalizeRoles(row: NonNullable<TenantUserAccessRow>): RoleWithPermissions[] {
  return row.user_roles
    .map((assignment) => assignment.roles)
    .filter((role): role is NonNullable<typeof role> => Boolean(role))
    .map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description ?? null,
      is_active: role.is_active ?? true,
      created_at: role.created_at ?? null,
      updated_at: role.updated_at ?? null,
      permissions: role.role_permissions.map((rolePermission) => ({
        id: rolePermission.permissions.id,
        name: rolePermission.permissions.name,
        description: rolePermission.permissions.description ?? null,
        created_at: rolePermission.permissions.created_at ?? null,
        updated_at: rolePermission.permissions.updated_at ?? null,
      })),
    }))
}

export async function fetchCurrentUserAccess(
  clerkUserId: string
): Promise<CurrentUserAccess | null> {
  const { data, error } = await supabase
    .from('tenant_users')
    .select(
      `
        clerk_user_id,
        user_roles (
          role_id,
          roles (
            id,
            name,
            description,
            is_active,
            created_at,
            updated_at,
            role_permissions (
              permissions (
                id,
                name,
                description,
                created_at,
                updated_at
              )
            )
          )
        )
      `
    )
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    return null
  }

  const row = data as unknown as TenantUserAccessRow
  if (!row) {
    return null
  }

  const roles = normalizeRoles(row)
  return {
    clerkUserId: row.clerk_user_id,
    roleIds: row.user_roles.map((assignment) => assignment.role_id),
    roleNames: roles.map((role) => role.name),
    permissionNames: expandPermissionNames(permissionNamesFromRoles(roles)),
  }
}

export function useCurrentUserAccess(
  clerkUserId: string | null | undefined,
  onRealtimeEvent?: () => void
) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: currentAccessQueryKey(clerkUserId),
    queryFn: () => fetchCurrentUserAccess(clerkUserId!),
    enabled: Boolean(clerkUserId),
    staleTime: 60_000,
  })
  const roleIdsKey = (query.data?.roleIds ?? []).join(',')

  useEffect(() => {
    if (!clerkUserId) {
      return undefined
    }

    const invalidate = () => {
      onRealtimeEvent?.()
      void queryClient.invalidateQueries({
        queryKey: currentAccessQueryKey(clerkUserId),
      })
    }

    const channels = [
      createRealtimeChannel(`rbac-user-roles-${clerkUserId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_roles',
            filter: `clerk_user_id=eq.${clerkUserId}`,
          },
          invalidate
        )
        .subscribe(),
      createRealtimeChannel(`rbac-tenant-user-${clerkUserId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tenant_users',
            filter: `clerk_user_id=eq.${clerkUserId}`,
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

    return () => {
      for (const channel of channels) {
        void supabase.removeChannel(channel)
      }
    }
  }, [clerkUserId, onRealtimeEvent, queryClient, roleIdsKey])

  return query
}
