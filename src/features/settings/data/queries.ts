import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
import type { AppSetting, UpsertSettingInput } from './schema'
import {
  getTenantSettingsServerFn,
  getSettingByKeyServerFn,
  getSettingsByGroupServerFn,
  upsertSettingServerFn,
  deleteSettingServerFn,
} from '@/server/fns/settings'

// ─── Query Keys ────────────────────────────────────────────────────
export const settingsKeys = {
  all: ['app-settings'] as const,
  byGroup: (group: string) => [...settingsKeys.all, 'group', group] as const,
  byKey: (key: string) => [...settingsKeys.all, 'key', key] as const,
}

// ─── Helper: Resolve Tenant & User ID from Client Auth Store ───────
export function getAuthTenantAndUser() {
  const { user, profile } = useAuthStore.getState().auth
  const tenantId =
    profile?.tenant_id ||
    profile?.parent_tenant_id ||
    (user?.app_metadata as Record<string, unknown> | undefined)?.tenant_id ||
    (user?.user_metadata as Record<string, unknown> | undefined)?.tenant_id ||
    null

  const userId = profile?.id || user?.id || null

  return {
    tenantId: tenantId ? String(tenantId) : null,
    userId: userId ? String(userId) : null,
  }
}

// ─── Fetch All Settings ────────────────────────────────────────────
export const useSettings = () => {
  return useQuery({
    queryKey: settingsKeys.all,
    queryFn: async (): Promise<AppSetting[]> => {
      // 1. Primary: Server Function
      try {
        const serverData = await getTenantSettingsServerFn({ data: {} })
        if (serverData && Array.isArray(serverData)) {
          return serverData as AppSetting[]
        }
      } catch {
        // Fallback to client Supabase query
      }

      // 2. Direct Supabase Fallback (filtered by tenant_id)
      const { tenantId } = getAuthTenantAndUser()
      let query = supabase.from('app_settings').select('*')
      if (tenantId) {
        query = query.eq('tenant_id', tenantId)
      }
      const { data, error } = await query.order('key', { ascending: true })

      if (error) throw error
      return (data ?? []) as AppSetting[]
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

// ─── Fetch Settings by Group ───────────────────────────────────────
export const useSettingsByGroup = (group: string) => {
  return useQuery({
    queryKey: settingsKeys.byGroup(group),
    queryFn: async (): Promise<AppSetting[]> => {
      // 1. Primary: Server Function
      try {
        const serverData = await getSettingsByGroupServerFn({ data: { group } })
        if (serverData && Array.isArray(serverData)) {
          return serverData as AppSetting[]
        }
      } catch {
        // Fallback to client Supabase query
      }

      // 2. Direct Supabase Fallback
      const { tenantId } = getAuthTenantAndUser()
      let query = supabase
        .from('app_settings')
        .select('*')
        .eq('group', group)

      if (tenantId) {
        query = query.eq('tenant_id', tenantId)
      }

      const { data, error } = await query.order('key', { ascending: true })

      if (error) throw error
      return (data ?? []) as AppSetting[]
    },
    enabled: !!group,
    staleTime: 5 * 60 * 1000,
  })
}

// ─── Fetch Single Setting by Key ───────────────────────────────────
export const useSettingByKey = (key: string) => {
  return useQuery({
    queryKey: settingsKeys.byKey(key),
    queryFn: async (): Promise<AppSetting | null> => {
      // 1. Primary: Server Function
      try {
        const serverData = await getSettingByKeyServerFn({ data: { key } })
        if (serverData !== undefined) {
          return serverData as AppSetting | null
        }
      } catch {
        // Fallback to client Supabase query
      }

      // 2. Direct Supabase Fallback
      const { tenantId } = getAuthTenantAndUser()
      let query = supabase
        .from('app_settings')
        .select('*')
        .eq('key', key)

      if (tenantId) {
        query = query.eq('tenant_id', tenantId)
      }

      const { data, error } = await query.maybeSingle()

      if (error) throw error
      return data as AppSetting | null
    },
    enabled: !!key,
    staleTime: 5 * 60 * 1000,
  })
}

// ─── Upsert Setting ────────────────────────────────────────────────
export const useUpsertSetting = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpsertSettingInput): Promise<AppSetting> => {
      const { tenantId, userId } = getAuthTenantAndUser()

      // 1. Primary: Server Function using Prisma (resolves tenantId server-side)
      try {
        const result = await upsertSettingServerFn({
          data: {
            ...input,
            tenant_id: input.tenant_id || tenantId || undefined,
          },
        })
        if (result) return result as AppSetting
      } catch {
        // Server fn unavailable, proceed to client fallback
      }

      // 2. Direct Supabase Fallback: resolve tenantId and scope to (tenant_id, key)
      let resolvedTenantId = input.tenant_id || tenantId
      if (!resolvedTenantId && userId) {
        const { data: tu } = await supabase
          .from('tenant_users')
          .select('tenant_id')
          .eq('id', userId)
          .maybeSingle()
        if (tu?.tenant_id) {
          resolvedTenantId = tu.tenant_id
        }
      }

      if (!resolvedTenantId) {
        throw new Error('Tenant context is required to save application settings.')
      }

      const { data, error } = await supabase
        .from('app_settings')
        .upsert(
          {
            tenant_id: resolvedTenantId,
            key: input.key,
            value: input.value,
            group: input.group ?? null,
            is_public: input.is_public ?? true,
            updated_by_user_id: userId,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'tenant_id,key',
          }
        )
        .select()
        .maybeSingle()

      if (error) throw error
      return data as AppSetting
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all })
      if (variables.group) {
        queryClient.invalidateQueries({
          queryKey: settingsKeys.byGroup(variables.group),
        })
      }
      queryClient.invalidateQueries({
        queryKey: settingsKeys.byKey(variables.key),
      })
    },
  })
}

// ─── Delete Setting ────────────────────────────────────────────────
export const useDeleteSetting = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (key: string) => {
      try {
        await deleteSettingServerFn({ data: { key } })
        return
      } catch {
        // Fallback to client Supabase query
      }

      const { tenantId } = getAuthTenantAndUser()
      let query = supabase.from('app_settings').delete().eq('key', key)
      if (tenantId) {
        query = query.eq('tenant_id', tenantId)
      }
      const { error } = await query
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all })
    },
  })
}
