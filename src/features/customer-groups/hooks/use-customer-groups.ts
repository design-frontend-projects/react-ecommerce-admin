import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface CustomerGroup {
  id: string
  group_id?: string | number
  name: string
  description: string | null
  minimum_order_amount: number | null
  discount_percentage: number | null
  created_at: string
}

export interface CustomerGroupInput {
  name: string
  description?: string
  minimum_order_amount?: number
  discount_percentage?: number
}

export const useCustomerGroups = () => {
  return useQuery({
    queryKey: ['customer-groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_groups')
        .select('*')
        .order('name')

      if (error) throw error
      return (data || []).map((row: any) => ({
        ...row,
        id: row.id,
        group_id: row.id,
      })) as CustomerGroup[]
    },
  })
}

export const useCreateCustomerGroup = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (newGroup: CustomerGroupInput) => {
      const { data, error } = await supabase
        .from('customer_groups')
        .insert(newGroup)
        .select()
        .maybeSingle()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-groups'] })
    },
  })
}

export const useUpdateCustomerGroup = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: CustomerGroupInput & { id: string | number }) => {
      const { data, error } = await supabase
        .from('customer_groups')
        .update(updates)
        .eq('id', String(id))
        .select()
        .maybeSingle()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-groups'] })
    },
  })
}

export const useDeleteCustomerGroup = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string | number) => {
      const { error } = await supabase
        .from('customer_groups')
        .delete()
        .eq('id', String(id))

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-groups'] })
    },
  })
}

