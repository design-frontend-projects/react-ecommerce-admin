import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Country } from '../data/schema'
import { useAuthEnabled } from '@/hooks/use-auth-query'
import { useAuth } from '@/hooks/use-auth'

export interface CountryInput {
  name: string
  code: string
  phone_code?: string
  is_active?: boolean
}

export const useCountries = () => {
  const { authEnabled } = useAuthEnabled({ permission: 'settings.view' })
  return useQuery({
    queryKey: ['countries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('countries')
        .select('*')
        .order('name')

      if (error) throw error
      return data as Country[]
    },
    enabled: authEnabled,
  })
}

export const useCountry = (id: number) => {
  const { authEnabled } = useAuthEnabled({ permission: 'settings.view' })
  return useQuery({
    queryKey: ['countries', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('countries')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (error) throw error
      return data as Country
    },
    enabled: !!id && authEnabled,
  })
}

export const useCreateCountry = () => {
  const { has } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (newCountry: CountryInput) => {
      if (!has({ permission: 'settings.manage' })) {
        throw new Error('You do not have permission to perform this action.')
      }
      const { data, error } = await supabase
        .from('countries')
        .insert(newCountry)
        .select()
        .maybeSingle()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['countries'] })
    },
  })
}

export const useUpdateCountry = () => {
  const { has } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: CountryInput & { id: number }) => {
      if (!has({ permission: 'settings.manage' })) {
        throw new Error('You do not have permission to perform this action.')
      }
      const { data, error } = await supabase
        .from('countries')
        .update(updates)
        .eq('id', id)
        .select()
        .maybeSingle()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['countries'] })
    },
  })
}

export const useDeleteCountry = () => {
  const { has } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      if (!has({ permission: 'settings.manage' })) {
        throw new Error('You do not have permission to perform this action.')
      }
      const { error } = await supabase.from('countries').delete().eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['countries'] })
    },
  })
}
