import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import {
  getAuthTenantAndUser,
  resolveClientTenantId,
  isValidUuid,
} from '@/lib/client-tenant'

export interface Customer {
  id: string
  customer_id?: string | number
  tenant_id?: string
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
  created_by_user_id?: string | null
  updated_by_user_id?: string | null
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
  tenant_id?: string
}

export const useCustomers = () => {
  return useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { tenantId } = getAuthTenantAndUser()
      let query = supabase.from('customers').select('*')
      if (tenantId && isValidUuid(tenantId)) {
        query = query.eq('tenant_id', tenantId)
      }

      const { data, error } = await query.order('last_name')

      if (error) throw error
      return (data || []).map((row: Record<string, unknown>) => ({
        ...row,
        id: String(row.id),
        customer_id: row.id ? String(row.id) : undefined,
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
        ...newCustomer,
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
    },
  })
}

export const useUpdateCustomer = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: CustomerInput & { id: string | number }) => {
      const { tenantId, userId } = getAuthTenantAndUser()
      const payload: Record<string, unknown> = {
        ...updates,
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
    },
  })
}

export const useDeleteCustomer = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string | number) => {
      const { tenantId } = getAuthTenantAndUser()
      let query = supabase.from('customers').delete().eq('id', String(id))
      if (tenantId && isValidUuid(tenantId)) {
        query = query.eq('tenant_id', tenantId)
      }

      const { error } = await query

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}

