import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface CustomerCard {
  id: string
  card_id?: string | number
  customer_id: string
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

export interface PaymentType {
  id: string
  name: string
  is_enabled: boolean
}

export interface CustomerCardInput {
  customer_id: string
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
        .order('added_at', { ascending: false })

      if (error) throw error
      return (data || []).map((row: any) => ({
        ...row,
        id: row.id,
        card_id: row.id,
      })) as CustomerCard[]
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
        .maybeSingle()

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
    }: CustomerCardInput & { id: string | number }) => {
      const { data, error } = await supabase
        .from('customer_cards')
        .update(updates)
        .eq('id', String(id))
        .select()
        .maybeSingle()

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
    mutationFn: async (id: string | number) => {
      const { error } = await supabase
        .from('customer_cards')
        .delete()
        .eq('id', String(id))

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-cards'] })
    },
  })
}

export const usePaymentTypes = () => {
  return useQuery({
    queryKey: ['payment-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_types')
        .select('*')
        .eq('is_enabled', true)
        .order('name', { ascending: true })

      if (error) throw error
      return data as PaymentType[]
    },
  })
}

