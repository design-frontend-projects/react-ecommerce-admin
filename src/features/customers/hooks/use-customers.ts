import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface Customer {
  customer_id: number
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  address: string | null
  created_at: string
}

export interface CustomerInput {
  first_name: string
  last_name: string
  email?: string
  phone?: string
  address?: string
}

export const useCustomers = () => {
  return useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('last_name')

      if (error) throw error
      return data as Customer[]
    },
  })
}

export const useCreateCustomer = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (newCustomer: CustomerInput) => {
      const { data, error } = await supabase
        .from('customers')
        .insert(newCustomer)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}

export const useUpdateCustomer = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: CustomerInput & { id: number }) => {
      const { data, error } = await supabase
        .from('customers')
        .update(updates)
        .eq('customer_id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}

export const useDeleteCustomer = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('customer_id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}
