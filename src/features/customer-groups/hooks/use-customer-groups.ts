import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
import {
  getAuthTenantAndUser,
  resolveClientTenantId,
  isValidUuid,
} from '@/lib/client-tenant'

export interface CustomerGroup {
  id: string
  group_id?: string | number
  tenant_id?: string
  name: string
  description: string | null
  minimum_order_amount: number | null
  discount_percentage: number | null
  created_at: string
  created_by_user_id?: string | null
  updated_by_user_id?: string | null
  enrolled_count?: number
}

export interface CustomerGroupInput {
  name: string
  description?: string | null
  minimum_order_amount?: number | null
  discount_percentage?: number | null
  tenant_id?: string
}

export const useCustomerGroups = () => {
  const currentTenantId = useAuthStore(
    (state) =>
      state.auth.profile?.tenant_id ||
      state.auth.profile?.parent_tenant_id ||
      (state.auth.user?.app_metadata as Record<string, unknown> | undefined)?.tenant_id ||
      (state.auth.user?.user_metadata as Record<string, unknown> | undefined)?.tenant_id ||
      null
  )

  return useQuery({
    queryKey: ['customer-groups', currentTenantId],
    queryFn: async () => {
      const resolvedTenantId = await resolveClientTenantId(
        currentTenantId ? String(currentTenantId) : undefined
      )

      let query = supabase.from('customer_groups').select('*, customers(id)')
      if (resolvedTenantId && isValidUuid(resolvedTenantId)) {
        query = query.eq('tenant_id', resolvedTenantId)
      }

      const { data, error } = await query.order('name')

      if (error) {
        // Fallback without join if foreign key relationship differs
        const fallback = await supabase
          .from('customer_groups')
          .select('*')
          .order('name')
        if (fallback.error) throw fallback.error
        return (fallback.data || []).map((row: Record<string, unknown>) => ({
          ...row,
          id: String(row.id),
          group_id: row.id ? String(row.id) : undefined,
          minimum_order_amount: row.minimum_order_amount != null ? Number(row.minimum_order_amount) : 0,
          discount_percentage: row.discount_percentage != null ? Number(row.discount_percentage) : 0,
          enrolled_count: 0,
        })) as CustomerGroup[]
      }

      return (data || []).map((row: Record<string, unknown>) => ({
        ...row,
        id: String(row.id),
        group_id: row.id ? String(row.id) : undefined,
        minimum_order_amount: row.minimum_order_amount != null ? Number(row.minimum_order_amount) : 0,
        discount_percentage: row.discount_percentage != null ? Number(row.discount_percentage) : 0,
        enrolled_count: Array.isArray(row.customers) ? row.customers.length : 0,
      })) as CustomerGroup[]
    },
  })
}

export const useCreateCustomerGroup = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (newGroup: CustomerGroupInput) => {
      const resolvedTenantId = await resolveClientTenantId(newGroup.tenant_id)
      if (!resolvedTenantId) {
        throw new Error(
          'Tenant ID could not be identified. Please ensure you are logged in.'
        )
      }

      const { userId } = getAuthTenantAndUser()
      const payload: Record<string, unknown> = {
        name: newGroup.name.trim(),
        description: newGroup.description?.trim() || null,
        minimum_order_amount: newGroup.minimum_order_amount ?? 0,
        discount_percentage: newGroup.discount_percentage ?? 0,
        tenant_id: resolvedTenantId,
      }

      if (userId && isValidUuid(userId)) {
        payload.created_by_user_id = userId
        payload.updated_by_user_id = userId
      }

      const { data, error } = await supabase
        .from('customer_groups')
        .insert(payload)
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
      const { tenantId, userId } = getAuthTenantAndUser()
      const payload: Record<string, unknown> = {
        name: updates.name.trim(),
        description: updates.description?.trim() || null,
        minimum_order_amount: updates.minimum_order_amount ?? 0,
        discount_percentage: updates.discount_percentage ?? 0,
      }

      if (userId && isValidUuid(userId)) {
        payload.updated_by_user_id = userId
      }

      let query = supabase
        .from('customer_groups')
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
      queryClient.invalidateQueries({ queryKey: ['customer-groups'] })
    },
  })
}

export const useDeleteCustomerGroup = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string | number) => {
      const { tenantId } = getAuthTenantAndUser()
      let query = supabase
        .from('customer_groups')
        .delete()
        .eq('id', String(id))

      if (tenantId && isValidUuid(tenantId)) {
        query = query.eq('tenant_id', tenantId)
      }

      const { error } = await query

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-groups'] })
    },
  })
}

