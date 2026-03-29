import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface Currency {
  id: string
  name: string
  code: string
  symbol: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CurrencyInput {
  name: string
  code: string
  symbol: string
  is_active?: boolean
}

export const useCurrencies = () => {
  return useQuery({
    queryKey: ['currencies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('currencies')
        .select('*')
        .order('name')

      if (error) throw error
      return data as Currency[]
    },
  })
}

export const useCurrency = (id: string) => {
  return useQuery({
    queryKey: ['currencies', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('currencies')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (error) throw error
      return data as Currency
    },
    enabled: !!id,
  })
}

export const useCreateCurrency = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (newCurrency: CurrencyInput) => {
      const { data, error } = await supabase
        .from('currencies')
        .insert(newCurrency)
        .select()
        .maybeSingle()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currencies'] })
    },
  })
}

export const useUpdateCurrency = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: CurrencyInput & { id: string }) => {
      const { data, error } = await supabase
        .from('currencies')
        .update(updates)
        .eq('id', id)
        .select()
        .maybeSingle()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currencies'] })
    },
  })
}

export const useDeleteCurrency = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('currencies').delete().eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currencies'] })
    },
  })
}
