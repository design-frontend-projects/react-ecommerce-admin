import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import {
  getAuthTenantAndUser,
  resolveClientTenantId,
  isValidUuid,
} from '@/lib/client-tenant'

export interface CustomerCard {
  id: string
  card_id?: string | number
  tenant_id?: string
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
  created_by_user_id?: string | null
  updated_by_user_id?: string | null
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
  tenant_id?: string
}

export const useCustomerCards = () => {
  return useQuery({
    queryKey: ['customer-cards'],
    queryFn: async () => {
      const { tenantId } = getAuthTenantAndUser()
      let query = supabase
        .from('customer_cards')
        .select('*, customers(first_name, last_name)')

      if (tenantId && isValidUuid(tenantId)) {
        query = query.eq('tenant_id', tenantId)
      }

      const { data, error } = await query.order('added_at', { ascending: false })

      if (error) throw error
      return (data || []).map((row: Record<string, unknown>) => ({
        ...row,
        id: String(row.id),
        card_id: row.id ? String(row.id) : undefined,
      })) as CustomerCard[]
    },
  })
}

export const useCreateCustomerCard = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (newCard: CustomerCardInput) => {
      const resolvedTenantId = await resolveClientTenantId(newCard.tenant_id)
      if (!resolvedTenantId) {
        throw new Error('Tenant ID could not be identified. Please ensure you are logged in.')
      }

      const { userId } = getAuthTenantAndUser()
      const payload: Record<string, unknown> = {
        ...newCard,
        tenant_id: resolvedTenantId,
      }

      if (userId && isValidUuid(userId)) {
        payload.created_by_user_id = userId
        payload.updated_by_user_id = userId
      }

      const { data, error } = await supabase
        .from('customer_cards')
        .insert(payload)
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
      const { tenantId, userId } = getAuthTenantAndUser()
      const payload: Record<string, unknown> = {
        ...updates,
      }

      if (userId && isValidUuid(userId)) {
        payload.updated_by_user_id = userId
      }

      let query = supabase
        .from('customer_cards')
        .update(payload)
        .eq('id', String(id))

      if (tenantId && isValidUuid(tenantId)) {
        query = query.eq('tenant_id', tenantId)
      }

      const { data, error } = await query.select().maybeSingle()

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
      const { tenantId } = getAuthTenantAndUser()
      let query = supabase.from('customer_cards').delete().eq('id', String(id))
      if (tenantId && isValidUuid(tenantId)) {
        query = query.eq('tenant_id', tenantId)
      }

      const { error } = await query

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

