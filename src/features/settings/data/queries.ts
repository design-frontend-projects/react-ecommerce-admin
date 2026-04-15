import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { AppSetting, UpsertSettingInput } from './schema'

// ─── Query Keys ────────────────────────────────────────────────────
export const settingsKeys = {
  all: ['app-settings'] as const,
  byGroup: (group: string) => [...settingsKeys.all, 'group', group] as const,
  byKey: (key: string) => [...settingsKeys.all, 'key', key] as const,
}

// ─── Fetch All Settings ────────────────────────────────────────────
export const useSettings = () => {
  return useQuery({
    queryKey: settingsKeys.all,
    queryFn: async (): Promise<AppSetting[]> => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .order('key', { ascending: true })

      if (error) throw error
      return (data ?? []) as AppSetting[]
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
  })
}

// ─── Fetch Settings by Group ───────────────────────────────────────
export const useSettingsByGroup = (group: string) => {
  return useQuery({
    queryKey: settingsKeys.byGroup(group),
    queryFn: async (): Promise<AppSetting[]> => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('group', group)
        .order('key', { ascending: true })

      if (error) throw error
      return (data ?? []) as AppSetting[]
    },
    staleTime: 5 * 60 * 1000,
  })
}

// ─── Fetch Single Setting by Key ───────────────────────────────────
export const useSettingByKey = (key: string) => {
  return useQuery({
    queryKey: settingsKeys.byKey(key),
    queryFn: async (): Promise<AppSetting | null> => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('key', key)
        .maybeSingle()

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
    mutationFn: async (input: UpsertSettingInput) => {
      // Use RPC to call the upsert function or use Supabase upsert
      const { data, error } = await supabase
        .from('app_settings')
        .upsert(
          {
            key: input.key,
            value: input.value,
            group: input.group ?? null,
            is_public: input.is_public ?? true,
          },
          {
            onConflict: 'clerk_user_id,key',
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
      const { error } = await supabase
        .from('app_settings')
        .delete()
        .eq('key', key)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all })
    },
  })
}
