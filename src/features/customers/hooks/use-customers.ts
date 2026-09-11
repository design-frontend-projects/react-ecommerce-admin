import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import {
  getAuthTenantAndUser,
  resolveClientTenantId,
  isValidUuid,
} from '@/lib/client-tenant'

export interface CustomerCard {
  id: string
  customer_id: string
  tenant_id?: string
  card_type: string | null
  last_four_digits: string
  expiry_month: number
  expiry_year: number
  cardholder_name: string
  billing_address: string | null
  is_default: boolean | null
  tokenized_id?: string | null
  added_at?: string | null
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
  tenant_id?: string
}

export interface CustomerGroupSummary {
  id: string
  name: string
  discount_percentage?: number | null
  minimum_order_amount?: number | null
}

export interface Customer {
  id: string
  customer_id?: string | number
  tenant_id?: string
  first_name: string
  last_name: string
  code: string | null
  customer_type_id?: string | null
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
  deleted_at?: string | null
  group_id: string | null
  created_by_user_id?: string | null
  updated_by_user_id?: string | null
  customer_groups?: CustomerGroupSummary | null
  customer_cards?: CustomerCard[]
}

export interface CustomerInput {
  first_name: string
  last_name: string
  code?: string
  customer_type_id?: string
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
  tenant_id?: string
}

export const useCustomers = () => {
  return useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { tenantId } = getAuthTenantAndUser()
      
      // Attempt rich relation query
      try {
        let query = supabase
          .from('customers')
          .select('*, customer_groups(id, name, discount_percentage, minimum_order_amount), customer_cards(*)')
          .is('deleted_at', null)

        if (tenantId && isValidUuid(tenantId)) {
          query = query.eq('tenant_id', tenantId)
        }

        const { data, error } = await query.order('last_name')

        if (!error && data) {
          return data.map((row: Record<string, unknown>) => ({
            ...row,
            id: String(row.id),
            customer_id: row.id ? String(row.id) : undefined,
            loyalty_points: row.loyalty_points != null ? Number(row.loyalty_points) : 0,
            is_active: row.is_active ?? true,
          })) as Customer[]
        }
      } catch (err) {
        console.warn('Customer relations fetch fallback:', err)
      }

      // Safe fallback if relations join schema varies
      let fallbackQuery = supabase
        .from('customers')
        .select('*')
        .is('deleted_at', null)

      if (tenantId && isValidUuid(tenantId)) {
        fallbackQuery = fallbackQuery.eq('tenant_id', tenantId)
      }

      const { data, error } = await fallbackQuery.order('last_name')
      if (error) throw error

      return (data || []).map((row: Record<string, unknown>) => ({
        ...row,
        id: String(row.id),
        customer_id: row.id ? String(row.id) : undefined,
        loyalty_points: row.loyalty_points != null ? Number(row.loyalty_points) : 0,
        is_active: row.is_active ?? true,
      })) as Customer[]
    },
  })
}

export const useCreateCustomer = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (newCustomer: CustomerInput) => {
      const resolvedTenantId = await resolveClientTenantId(newCustomer.tenant_id)
      if (!resolvedTenantId) {
        throw new Error('Tenant ID could not be identified. Please ensure you are logged in.')
      }

      const { userId } = getAuthTenantAndUser()
      const payload: Record<string, unknown> = {
        first_name: newCustomer.first_name.trim(),
        last_name: newCustomer.last_name.trim(),
        code: newCustomer.code?.trim() || null,
        customer_type_id: newCustomer.customer_type_id || null,
        email: newCustomer.email?.trim() || null,
        phone: newCustomer.phone?.trim() || null,
        address_line1: newCustomer.address_line1?.trim() || null,
        address_line2: newCustomer.address_line2?.trim() || null,
        city: newCustomer.city?.trim() || null,
        state: newCustomer.state?.trim() || null,
        postal_code: newCustomer.postal_code?.trim() || null,
        country: newCustomer.country?.trim() || 'USA',
        date_of_birth: newCustomer.date_of_birth || null,
        loyalty_points: newCustomer.loyalty_points ?? 0,
        is_active: newCustomer.is_active ?? true,
        group_id: newCustomer.group_id || null,
        tenant_id: resolvedTenantId,
      }

      if (userId && isValidUuid(userId)) {
        payload.created_by_user_id = userId
        payload.updated_by_user_id = userId
      }

      const { data, error } = await supabase
        .from('customers')
        .insert(payload)
        .select()
        .maybeSingle()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['customer-groups'] })
    },
  })
}

export const useUpdateCustomer = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: CustomerInput & { id: string | number }) => {
      const { tenantId, userId } = getAuthTenantAndUser()
      const payload: Record<string, unknown> = {
        first_name: updates.first_name.trim(),
        last_name: updates.last_name.trim(),
        code: updates.code?.trim() || null,
        customer_type_id: updates.customer_type_id || null,
        email: updates.email?.trim() || null,
        phone: updates.phone?.trim() || null,
        address_line1: updates.address_line1?.trim() || null,
        address_line2: updates.address_line2?.trim() || null,
        city: updates.city?.trim() || null,
        state: updates.state?.trim() || null,
        postal_code: updates.postal_code?.trim() || null,
        country: updates.country?.trim() || 'USA',
        date_of_birth: updates.date_of_birth || null,
        loyalty_points: updates.loyalty_points ?? 0,
        is_active: updates.is_active ?? true,
        group_id: updates.group_id || null,
        updated_at: new Date().toISOString(),
      }

      if (userId && isValidUuid(userId)) {
        payload.updated_by_user_id = userId
      }

      let query = supabase
        .from('customers')
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
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['customer-groups'] })
    },
  })
}

export const useDeleteCustomer = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string | number) => {
      const { tenantId } = getAuthTenantAndUser()

      // Soft delete first
      let softDeleteQuery = supabase
        .from('customers')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', String(id))

      if (tenantId && isValidUuid(tenantId)) {
        softDeleteQuery = softDeleteQuery.eq('tenant_id', tenantId)
      }

      const { error: softError } = await softDeleteQuery

      if (softError) {
        // Fallback to hard delete if soft delete isn't preferred or allowed
        let hardDeleteQuery = supabase.from('customers').delete().eq('id', String(id))
        if (tenantId && isValidUuid(tenantId)) {
          hardDeleteQuery = hardDeleteQuery.eq('tenant_id', tenantId)
        }
        const { error: hardError } = await hardDeleteQuery
        if (hardError) throw hardError
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['customer-groups'] })
    },
  })
}

// --- Customer Cards Hooks ---

export const useCustomerCards = (customerId: string | undefined) => {
  return useQuery({
    queryKey: ['customer-cards', customerId],
    queryFn: async () => {
      if (!customerId) return []
      const { data, error } = await supabase
        .from('customer_cards')
        .select('*')
        .eq('customer_id', customerId)
        .order('is_default', { ascending: false })

      if (error) throw error
      return (data || []) as CustomerCard[]
    },
    enabled: Boolean(customerId),
  })
}

export const useCreateCustomerCard = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CustomerCardInput) => {
      const resolvedTenantId = await resolveClientTenantId(input.tenant_id)
      if (!resolvedTenantId) {
        throw new Error('Tenant ID required.')
      }

      const { userId } = getAuthTenantAndUser()
      const payload: Record<string, unknown> = {
        customer_id: input.customer_id,
        tenant_id: resolvedTenantId,
        card_type: input.card_type || 'Visa',
        last_four_digits: input.last_four_digits,
        expiry_month: input.expiry_month,
        expiry_year: input.expiry_year,
        cardholder_name: input.cardholder_name,
        billing_address: input.billing_address || null,
        is_default: input.is_default ?? false,
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
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['customer-cards', vars.customer_id] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}

export const useDeleteCustomerCard = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ cardId, customerId }: { cardId: string; customerId: string }) => {
      const { error } = await supabase
        .from('customer_cards')
        .delete()
        .eq('id', cardId)

      if (error) throw error
      return { cardId, customerId }
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['customer-cards', res.customerId] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}
