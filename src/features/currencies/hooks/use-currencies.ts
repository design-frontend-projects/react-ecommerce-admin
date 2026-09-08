import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthEnabled } from '@/hooks/use-auth-query'
import { useAuth } from '@/hooks/use-auth'

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

export interface UseCurrenciesOptions {
  onlyActive?: boolean
  permission?: string
}

export const useCurrencies = (options?: UseCurrenciesOptions) => {
  const { authEnabled } = useAuthEnabled(
    options?.permission ? { permission: options.permission } : undefined
  )
  return useQuery({
    queryKey: ['currencies', options?.onlyActive],
    queryFn: async () => {
      let query = supabase
        .from('currencies')
        .select('*')
        .order('code')

      if (options?.onlyActive) {
        query = query.neq('is_active', false)
      }

      const { data, error } = await query

      if (error) throw error
      return data as Currency[]
    },
    enabled: authEnabled,
  })
}

export const useCurrency = (id: string) => {
  const { authEnabled } = useAuthEnabled({ permission: 'settings.view' })
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
    enabled: !!id && authEnabled,
  })
}

export const useCreateCurrency = () => {
  const { has } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (newCurrency: CurrencyInput) => {
      if (!has({ permission: 'settings.manage' })) {
        throw new Error('You do not have permission to perform this action.')
      }
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
  const { has } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: CurrencyInput & { id: string }) => {
      if (!has({ permission: 'settings.manage' })) {
        throw new Error('You do not have permission to perform this action.')
      }
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
  const { has } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      if (!has({ permission: 'settings.manage' })) {
        throw new Error('You do not have permission to perform this action.')
      }
      const { error } = await supabase.from('currencies').delete().eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currencies'] })
    },
  })
}
