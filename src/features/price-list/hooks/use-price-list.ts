import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface PriceListItem {
  price_id: number
  product_id: number
  group_id: number | null
  price: number
  start_date: string | null
  end_date: string | null
  is_active: boolean
  products?: {
    name: string
  }
}

export interface PriceListInput {
  product_id: number
  group_id?: number
  price: number
  start_date?: string
  end_date?: string
  is_active?: boolean
}

export const usePriceList = () => {
  return useQuery({
    queryKey: ['price-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('price_list')
        .select('*, products(name)')
        .order('price_id', { ascending: false })

      if (error) throw error
      return data as PriceListItem[]
    },
  })
}

export const useCreatePriceList = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (newItem: PriceListInput) => {
      const { data, error } = await supabase
        .from('price_list')
        .insert(newItem)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-list'] })
    },
  })
}

export const useUpdatePriceList = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: PriceListInput & { id: number }) => {
      const { data, error } = await supabase
        .from('price_list')
        .update(updates)
        .eq('price_id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-list'] })
    },
  })
}

export const useDeletePriceList = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('price_list')
        .delete()
        .eq('price_id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-list'] })
    },
  })
}
