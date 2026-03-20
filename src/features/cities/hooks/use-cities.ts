import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface City {
  id: number
  name: string
  country_id: number
  is_active: boolean
  created_at: string
  countries?: {
    name: string
  }
}

export interface CityInput {
  name: string
  country_id: number
  is_active?: boolean
}

export const useCities = (search?: string) => {
  return useQuery({
    queryKey: ['cities', search],
    queryFn: async () => {
      let query = supabase
        .from('cities')
        .select(`
          *,
          country:countries(name)
        `)
        .order('name')

      if (search) {
        query = query.ilike('name', `%${search}%`)
      }

      const { data, error } = await query

      if (error) throw error
      return data as City[]
    },
  })
}

export const useCity = (id: number) => {
  return useQuery({
    queryKey: ['cities', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cities')
        .select('*, countries(name)')
        .eq('id', id)
        .single()

      if (error) throw error
      return data as City
    },
    enabled: !!id,
  })
}

export const useCreateCity = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (newCity: CityInput) => {
      const { data, error } = await supabase
        .from('cities')
        .insert(newCity)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cities'] })
    },
  })
}

export const useUpdateCity = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: CityInput & { id: number }) => {
      const { data, error } = await supabase
        .from('cities')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cities'] })
    },
  })
}

export const useDeleteCity = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('cities')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cities'] })
    },
  })
}
