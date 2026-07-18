import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { type City } from '../data/schema'
import { useAuthEnabled } from '@/hooks/use-auth-query'
import { useAuth } from '@/hooks/use-auth'

// Re-export City type for backward compatibility
export type { City }

export interface CityInput {
  name: string
  country_id: string
  is_active?: boolean
}

export const useCities = (countryId?: string, search?: string) => {
  const { authEnabled } = useAuthEnabled({ permission: 'settings.view' })
  return useQuery({
    queryKey: ['cities', { countryId, search }],
    queryFn: async () => {
      let query = supabase
        .from('cities')
        .select(
          `
          *,
          country:countries(name)
        `
        )
        .order('name')

      if (countryId) {
        query = query.eq('country_id', countryId)
      }

      if (search) {
        query = query.ilike('name', `%${search}%`)
      }

      const { data, error } = await query

      if (error) throw error
      return data as City[]
    },
    enabled: authEnabled,
  })
}

export const useCity = (id: string) => {
  const { authEnabled } = useAuthEnabled({ permission: 'settings.view' })
  return useQuery({
    queryKey: ['cities', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cities')
        .select('*, countries(name)')
        .eq('id', id)
        .maybeSingle()

      if (error) throw error
      return data as City
    },
    enabled: !!id && authEnabled,
  })
}

export const useCreateCity = () => {
  const { has } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (newCity: CityInput) => {
      if (!has({ permission: 'settings.manage' })) {
        throw new Error('You do not have permission to perform this action.')
      }
      const { data, error } = await supabase
        .from('cities')
        .insert(newCity)
        .select()
        .maybeSingle()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cities'] })
    },
  })
}

export const useUpdateCity = () => {
  const { has } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: CityInput & { id: string }) => {
      if (!has({ permission: 'settings.manage' })) {
        throw new Error('You do not have permission to perform this action.')
      }
      const { data, error } = await supabase
        .from('cities')
        .update(updates)
        .eq('id', id)
        .select()
        .maybeSingle()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cities'] })
    },
  })
}

export const useDeleteCity = () => {
  const { has } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      if (!has({ permission: 'settings.manage' })) {
        throw new Error('You do not have permission to perform this action.')
      }
      const { error } = await supabase.from('cities').delete().eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cities'] })
    },
  })
}
