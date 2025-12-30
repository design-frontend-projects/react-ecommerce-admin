import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface CustomerCard {
  card_id: number
  customer_id: number
  card_type: string | null
  last_four_digits: string
  expiry_month: number
  expiry_year: number
  cardholder_name: string
  billing_address: string | null
  is_default: boolean | null
  tokenized_id: string | null
  added_at: string | null
  customers?: {
    first_name: string
    last_name: string
  }
}

export interface CustomerCardInput {
  customer_id: number
  card_type?: string
  last_four_digits: string
  expiry_month: number
  expiry_year: number
  cardholder_name: string
  billing_address?: string
  is_default?: boolean
  tokenized_id?: string
}

export const useCustomerCards = () => {
  return useQuery({
    queryKey: ['customer-cards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_cards')
        .select('*, customers(first_name, last_name)')
        .order('card_id', { ascending: false })

      if (error) throw error
      return data as CustomerCard[]
    },
  })
}

export const useCreateCustomerCard = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (newCard: CustomerCardInput) => {
      const { data, error } = await supabase
        .from('customer_cards')
        .insert(newCard)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-cards'] })
    },
  })
}

export const useUpdateCustomerCard = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: CustomerCardInput & { id: number }) => {
      const { data, error } = await supabase
        .from('customer_cards')
        .update(updates)
        .eq('card_id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-cards'] })
    },
  })
}

export const useDeleteCustomerCard = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('customer_cards')
        .delete()
        .eq('card_id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-cards'] })
    },
  })
}
