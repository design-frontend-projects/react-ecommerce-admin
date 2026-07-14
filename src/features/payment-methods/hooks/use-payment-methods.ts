import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface PaymentMethod {
  id: string
  name: string
  icon: string | null
  is_enabled: boolean
  is_default: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface PaymentMethodInput {
  name: string
  icon?: string | null
  is_enabled?: boolean
  is_default?: boolean
  sort_order?: number
}

export const usePaymentMethods = () => {
  return useQuery({
    queryKey: ['payment-methods'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('res_payment_methods')
        .select('*')
        .order('sort_order')

      if (error) throw error
      return data as PaymentMethod[]
    },
  })
}

export const usePaymentMethod = (id: string) => {
  return useQuery({
    queryKey: ['payment-methods', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('res_payment_methods')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (error) throw error
      return data as PaymentMethod
    },
    enabled: !!id,
  })
}

export const useCreatePaymentMethod = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: PaymentMethodInput) => {
      const { data, error } = await supabase
        .from('res_payment_methods')
        .insert(input)
        .select()
        .maybeSingle()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] })
    },
  })
}

export const useUpdatePaymentMethod = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: PaymentMethodInput & { id: string }) => {
      const { data, error } = await supabase
        .from('res_payment_methods')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .maybeSingle()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] })
    },
  })
}

export const useDeletePaymentMethod = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('res_payment_methods')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] })
    },
  })
}

export const useSetDefaultPaymentMethod = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      // First, unset all defaults
      const { error: unsetError } = await supabase
        .from('res_payment_methods')
        .update({ is_default: false, updated_at: new Date().toISOString() })
        .eq('is_default', true)

      if (unsetError) throw unsetError

      // Then set the chosen one as default
      const { data, error: setError } = await supabase
        .from('res_payment_methods')
        .update({ is_default: true, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .maybeSingle()

      if (setError) throw setError
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] })
    },
  })
}
