import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface TaxRate {
  tax_rate_id: number
  tax_type: string
  rate: number
  country_code: string
  state_province: string | null
  description: string | null
  effective_from: string
  effective_to: string | null
  is_active: boolean
}

export interface TaxRateInput {
  tax_type: string
  rate: number
  country_code: string
  state_province?: string | null
  description?: string | null
  effective_from: string
  effective_to?: string | null
  is_active: boolean
}

export const useTaxRates = () => {
  return useQuery({
    queryKey: ['tax-rates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tax_rates')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as TaxRate[]
    },
  })
}

export const useCreateTaxRate = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (newRate: TaxRateInput) => {
      const { data, error } = await supabase
        .from('tax_rates')
        .insert(newRate)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-rates'] })
    },
  })
}

export const useUpdateTaxRate = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: TaxRateInput & { id: number }) => {
      const { data, error } = await supabase
        .from('tax_rates')
        .update(updates)
        .eq('tax_rate_id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-rates'] })
    },
  })
}

export const useDeleteTaxRate = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('tax_rates')
        .delete()
        .eq('tax_rate_id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-rates'] })
    },
  })
}
