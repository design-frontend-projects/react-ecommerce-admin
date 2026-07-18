import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthEnabled } from '@/hooks/use-auth-query'
import { useAuth } from '@/hooks/use-auth'

export interface Branch {
  id: string
  name: string
  city_id: string
  address: string | null
  phone: string | null
  is_active: boolean
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
  address?: string | null
  phone?: string | null
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

export const useCreateBranch = () => {
  const { has } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (newBranch: BranchInput) => {
      if (!has({ permission: 'settings.manage' })) {
        throw new Error('You do not have permission to perform this action.')
      }
      const { data, error } = await supabase
        .from('branches')
        .insert(newBranch)
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
      const { data, error } = await supabase
        .from('branches')
        .update(updates)
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
