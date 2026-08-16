import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface Customer {
  id: string
  customer_id?: string | number
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  country: string | null
  date_of_birth: string | null
  loyalty_points: number | null
  is_active: boolean | null
  created_at: string
  updated_at: string | null
  group_id: string | null
}

export interface CustomerInput {
  first_name: string
  last_name: string
  email?: string
  phone?: string
  address_line1?: string
  address_line2?: string
  city?: string
  state?: string
  postal_code?: string
  country?: string
  date_of_birth?: string
  loyalty_points?: number
  is_active?: boolean
  group_id?: string
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
      return (data || []).map((row: any) => ({
        ...row,
        id: row.id,
        customer_id: row.id,
      })) as Customer[]
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
        .maybeSingle()

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
    mutationFn: async ({ id, ...updates }: CustomerInput & { id: string | number }) => {
      const { data, error } = await supabase
        .from('customers')
        .update(updates)
        .eq('id', String(id))
        .select()
        .maybeSingle()

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
    mutationFn: async (id: string | number) => {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', String(id))

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}

