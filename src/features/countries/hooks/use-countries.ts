import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface Country {
  id: string
  name: string
  code: string
  phone_code: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CountryInput {
  name: string
  code: string
  phone_code: string
  is_active?: boolean
}

export const useCountries = () => {
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
  })
}

export const useCountry = (id: string) => {
  return useQuery({
    queryKey: ['countries', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('countries')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data as Country
    },
    enabled: !!id,
  })
}

export const useCreateCountry = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (newCountry: CountryInput) => {
      const { data, error } = await supabase
        .from('countries')
        .insert(newCountry)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['countries'] })
    },
  })
}

export const useUpdateCountry = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: CountryInput & { id: string }) => {
      const { data, error } = await supabase
        .from('countries')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['countries'] })
    },
  })
}

export const useDeleteCountry = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('countries')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['countries'] })
    },
  })
}
