import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

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
  })
}

export const useBranch = (id: string) => {
  return useQuery({
    queryKey: ['branches', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('*, cities(name, countries(name))')
        .eq('id', id)
        .single()

      if (error) throw error
      return data as Branch
    },
    enabled: !!id,
  })
}

export const useCreateBranch = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (newBranch: BranchInput) => {
      const { data, error } = await supabase
        .from('branches')
        .insert(newBranch)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] })
    },
  })
}

export const useUpdateBranch = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: BranchInput & { id: string }) => {
      const { data, error } = await supabase
        .from('branches')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] })
    },
  })
}

export const useDeleteBranch = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('branches')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] })
    },
  })
}
