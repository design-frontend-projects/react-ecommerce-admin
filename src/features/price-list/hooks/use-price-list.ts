import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'

export interface PriceListItem {
  id: string
  product_id: string
  group_id: string | null
  price: number
  start_date: string | null
  end_date: string | null
  is_active: boolean
  description?: string | null
  tenant_id?: string
  products?: {
    name: string
  } | null
}

export interface PriceListInput {
  product_id: string
  group_id?: string | null
  price: number
  start_date?: string | null
  end_date?: string | null
  is_active?: boolean
  description?: string | null
  tenant_id?: string
}

function getAuthTenantAndUser() {
  const { user, profile } = useAuthStore.getState().auth
  const tenantId =
    profile?.tenant_id ||
    (user?.app_metadata as Record<string, unknown> | undefined)?.tenant_id ||
    (user?.user_metadata as Record<string, unknown> | undefined)?.tenant_id ||
    null

  const userId = profile?.id || profile?.auth_user_id || user?.id || null

  return {
    tenantId: tenantId ? String(tenantId) : null,
    userId: userId ? String(userId) : null,
  }
}

export const usePriceList = () => {
  return useQuery({
    queryKey: ['price-list'],
    queryFn: async () => {
      const { tenantId } = getAuthTenantAndUser()
      let query = supabase
        .from('price_list')
        .select('*, products(name)')

      if (tenantId) {
        query = query.eq('tenant_id', tenantId)
      }

      const { data, error } = await query.order('start_date', { ascending: false })

      if (error) throw error
      return (data || []) as unknown as PriceListItem[]
    },
  })
}

export const useCreatePriceList = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (newItem: PriceListInput) => {
      const { tenantId, userId } = getAuthTenantAndUser()
      const payload = {
        ...newItem,
        tenant_id: newItem.tenant_id || tenantId,
        created_by_user_id: userId,
      }

      const { data, error } = await supabase
        .from('price_list')
        .insert(payload)
        .select('*, products(name)')
        .maybeSingle()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-list'] })
      queryClient.invalidateQueries({ queryKey: ['price-lists'] })
    },
  })
}

export const useUpdatePriceList = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: PriceListInput & { id: string }) => {
      const { userId } = getAuthTenantAndUser()
      const payload = {
        ...updates,
        updated_by_user_id: userId,
      }

      const { data, error } = await supabase
        .from('price_list')
        .update(payload)
        .eq('id', id)
        .select('*, products(name)')
        .maybeSingle()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-list'] })
      queryClient.invalidateQueries({ queryKey: ['price-lists'] })
    },
  })
}

export const useDeletePriceList = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('price_list')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-list'] })
      queryClient.invalidateQueries({ queryKey: ['price-lists'] })
    },
  })
}

