import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthEnabled } from '@/hooks/use-auth-query'
import { useAuth } from '@/hooks/use-auth'

import { useAuthStore } from '@/stores/auth-store'

export interface Branch {
  id: string
  name: string
  city_id: string
  email: string | null
  address: string | null
  phone: string | null
  is_active: boolean
  tenant_id: string
  created_at: string
  updated_at: string
  cities?: {
    name: string
    countries?: {
      name: string
    }
  }
}

export interface BranchInput {
  name: string
  city_id: string
  email?: string | null
  address?: string | null
  phone?: string | null
  tenant_id?: string | null
  is_active?: boolean
}

export const useBranches = () => {
  const { authEnabled } = useAuthEnabled({ permission: 'settings.view' })
  return useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('*, cities(name, countries(name))')
        .order('name')

      if (error) throw error
      return data as Branch[]
    },
    enabled: authEnabled,
  })
}

export const useBranch = (id: string) => {
  const { authEnabled } = useAuthEnabled({ permission: 'settings.view' })
  return useQuery({
    queryKey: ['branches', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('*, cities(name, countries(name))')
        .eq('id', id)
        .maybeSingle()

      if (error) throw error
      return data as Branch
    },
    enabled: !!id && authEnabled,
  })
}

function getAuthTenantAndUser() {
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

export const useCreateBranch = () => {
  const { has } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (newBranch: BranchInput) => {
      if (!has({ permission: 'settings.manage' })) {
        throw new Error('You do not have permission to perform this action.')
      }

      const { tenantId, userId } = getAuthTenantAndUser()
      let resolvedTenantId = newBranch.tenant_id || tenantId

      if (!resolvedTenantId) {
        const { data: defaultTenant } = await supabase
          .from('tenants')
          .select('id')
          .limit(1)
          .maybeSingle()
        if (defaultTenant?.id) {
          resolvedTenantId = defaultTenant.id
        }
      }

      const payload = {
        ...newBranch,
        ...(resolvedTenantId ? { tenant_id: resolvedTenantId } : {}),
        ...(userId ? { created_by_user_id: userId, updated_by_user_id: userId } : {}),
      }

      const { data, error } = await supabase
        .from('branches')
        .insert(payload)
        .select()
        .maybeSingle()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] })
    },
  })
}

export const useUpdateBranch = () => {
  const { has } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: BranchInput & { id: string }) => {
      if (!has({ permission: 'settings.manage' })) {
        throw new Error('You do not have permission to perform this action.')
      }

      const { userId } = getAuthTenantAndUser()
      const payload = {
        ...updates,
        ...(userId ? { updated_by_user_id: userId } : {}),
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('branches')
        .update(payload)
        .eq('id', id)
        .select()
        .maybeSingle()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] })
    },
  })
}

export const useDeleteBranch = () => {
  const { has } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      if (!has({ permission: 'settings.manage' })) {
        throw new Error('You do not have permission to perform this action.')
      }
      const { error } = await supabase.from('branches').delete().eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] })
    },
  })
}
