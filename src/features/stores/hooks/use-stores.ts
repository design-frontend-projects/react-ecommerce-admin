import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Store } from '../data/schema'

export const useStores = (search?: string) => {
  return useQuery({
    queryKey: ['stores', search],
    queryFn: async () => {
      let query = supabase
        .from('stores')
        .select('*, cities(name, countries(name)), branches(name)')
        .order('name')

      if (search) {
        query = query.ilike('name', `%${search}%`)
      }

      const { data, error } = await query

      if (error) throw error
      return data as any[] // Using any for local join results mapping
    },
  })
}

export const useStore = (id: string) => {
  return useQuery({
    queryKey: ['stores', id],
    queryFn: async () => {
      if (!id) return null
      const { data, error } = await supabase
        .from('stores')
        .select('*, cities(name, countries(name)), branches(name)')
        .eq('store_id', id)
        .maybeSingle()

      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

export const useCreateStore = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (newStore: Partial<Store>) => {
      const { data, error } = await supabase.from('stores').insert(newStore)

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] })
    },
  })
}

export const useUpdateStore = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      store_id,
      ...updates
    }: Partial<Store> & { store_id: string }) => {
      const { data, error } = await supabase
        .from('stores')
        .update(updates)
        .eq('store_id', store_id)
        .select()
        .maybeSingle()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] })
    },
  })
}

export const useDeleteStore = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('stores')
        .delete()
        .eq('store_id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] })
    },
  })
}
