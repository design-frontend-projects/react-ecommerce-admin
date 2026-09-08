import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
import { useAuthEnabled } from '@/hooks/use-auth-query'
import { useAuth } from '@/hooks/use-auth'
import type { Channel, ChannelInput } from '../data/schema'

export function getAuthTenantAndUser() {
  const { user, profile } = useAuthStore.getState().auth
  const tenantId =
    profile?.tenant_id ||
    (user?.app_metadata as Record<string, unknown> | undefined)?.tenant_id ||
    (user?.user_metadata as Record<string, unknown> | undefined)?.tenant_id ||
    null

  const userId = profile?.id || profile?.auth_user_id || user?.id || null

  return {
    tenantId: tenantId ? String(tenantId) : null,
    userId: userId ? String(userId) : null,
  }
}

export const useChannels = (search?: string) => {
  const { authEnabled } = useAuthEnabled({ permission: 'settings.view' })
  const { tenantId } = getAuthTenantAndUser()

  return useQuery({
    queryKey: ['channels', { search, tenantId }],
    queryFn: async () => {
      let query = supabase
        .from('channels')
        .select('*')
        .order('name', { ascending: true })

      if (tenantId) {
        query = query.eq('tenant_id', tenantId)
      }

      if (search?.trim()) {
        const term = search.trim()
        query = query.or(
          `name.ilike.%${term}%,code.ilike.%${term}%,name_ar.ilike.%${term}%`
        )
      }

      const { data, error } = await query

      if (error) throw error
      return (data || []) as Channel[]
    },
    enabled: authEnabled,
  })
}

export const useChannel = (id: string) => {
  const { authEnabled } = useAuthEnabled({ permission: 'settings.view' })
  const { tenantId } = getAuthTenantAndUser()

  return useQuery({
    queryKey: ['channels', id, { tenantId }],
    queryFn: async () => {
      if (!id) return null

      let query = supabase.from('channels').select('*').eq('id', id)

      if (tenantId) {
        query = query.eq('tenant_id', tenantId)
      }

      const { data, error } = await query.maybeSingle()

      if (error) throw error
      return data as Channel | null
    },
    enabled: !!id && authEnabled,
  })
}

export const useCreateChannel = () => {
  const { has } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: ChannelInput) => {
      if (!has({ permission: 'settings.manage' })) {
        throw new Error('You do not have permission to perform this action.')
      }

      const { tenantId, userId } = getAuthTenantAndUser()
      if (!tenantId) {
        throw new Error('Tenant ID not found. Please log in again.')
      }

      const payload = {
        tenant_id: tenantId,
        code: input.code.trim().toUpperCase(),
        name: input.name.trim(),
        name_ar: input.name_ar?.trim() || null,
        description: input.description?.trim() || null,
        is_active: input.is_active ?? true,
        created_by_user_id: userId,
        updated_by_user_id: userId,
      }

      const { data, error } = await supabase
        .from('channels')
        .insert(payload)
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          throw new Error('A channel with this code already exists.')
        }
        throw error
      }

      return data as Channel
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] })
      queryClient.invalidateQueries({ queryKey: ['channel-options'] })
      queryClient.invalidateQueries({ queryKey: ['price-list-options'] })
    },
  })
}

export const useUpdateChannel = () => {
  const { has } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...input }: ChannelInput & { id: string }) => {
      if (!has({ permission: 'settings.manage' })) {
        throw new Error('You do not have permission to perform this action.')
      }

      const { userId, tenantId } = getAuthTenantAndUser()

      const payload = {
        code: input.code.trim().toUpperCase(),
        name: input.name.trim(),
        name_ar: input.name_ar?.trim() || null,
        description: input.description?.trim() || null,
        is_active: input.is_active ?? true,
        updated_by_user_id: userId,
        updated_at: new Date().toISOString(),
      }

      let query = supabase
        .from('channels')
        .update(payload)
        .eq('id', id)

      if (tenantId) {
        query = query.eq('tenant_id', tenantId)
      }

      const { data, error } = await query.select().single()

      if (error) {
        if (error.code === '23505') {
          throw new Error('A channel with this code already exists.')
        }
        throw error
      }

      return data as Channel
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['channels'] })
      queryClient.invalidateQueries({ queryKey: ['channels', data.id] })
      queryClient.invalidateQueries({ queryKey: ['channel-options'] })
      queryClient.invalidateQueries({ queryKey: ['price-list-options'] })
    },
  })
}

export const useDeleteChannel = () => {
  const { has } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      if (!has({ permission: 'settings.manage' })) {
        throw new Error('You do not have permission to perform this action.')
      }

      const { tenantId } = getAuthTenantAndUser()

      let query = supabase.from('channels').delete().eq('id', id)
      if (tenantId) {
        query = query.eq('tenant_id', tenantId)
      }

      const { error } = await query

      if (error) {
        if (error.code === '23503') {
          throw new Error(
            'Cannot delete channel because it is referenced by other records (e.g. price lists or sales invoices).'
          )
        }
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] })
      queryClient.invalidateQueries({ queryKey: ['channel-options'] })
      queryClient.invalidateQueries({ queryKey: ['price-list-options'] })
    },
  })
}
