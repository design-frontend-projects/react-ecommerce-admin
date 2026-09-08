import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { type Store } from '../data/schema'
import { useAuthEnabled } from '@/hooks/use-auth-query'
import { useAuth } from '@/hooks/use-auth'
import {
  getAuthTenantAndUser,
  resolveClientTenantId,
  isValidUuid,
} from '@/lib/client-tenant'

export const useStores = (search?: string) => {
  const { authEnabled } = useAuthEnabled({ permission: 'settings.view' })
  const { tenantId } = getAuthTenantAndUser()

  return useQuery({
    queryKey: ['stores', { search, tenantId }],
    queryFn: async () => {
      let query = supabase
        .from('stores')
        .select('*, cities(name, countries(name)), branches(name)')
        .order('name')

      if (tenantId && isValidUuid(tenantId)) {
        query = query.eq('tenant_id', tenantId)
      }

      if (search) {
        query = query.ilike('name', `%${search}%`)
      }

      const { data, error } = await query

      if (error) throw error
      return (data ?? []) as any[] // Using any for local join results mapping
    },
    enabled: authEnabled,
  })
}

export const useStore = (id: string) => {
  const { authEnabled } = useAuthEnabled({ permission: 'settings.view' })
  const { tenantId } = getAuthTenantAndUser()

  return useQuery({
    queryKey: ['stores', id, { tenantId }],
    queryFn: async () => {
      if (!id) return null
      let query = supabase
        .from('stores')
        .select('*, cities(name, countries(name)), branches(name)')
        .eq('store_id', id)

      if (tenantId && isValidUuid(tenantId)) {
        query = query.eq('tenant_id', tenantId)
      }

      const { data, error } = await query.maybeSingle()

      if (error) throw error
      return data
    },
    enabled: !!id && authEnabled,
  })
}

export const useCreateStore = () => {
  const { has } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (newStore: Partial<Store> & Record<string, unknown>) => {
      if (!has({ permission: 'settings.manage' })) {
        throw new Error('You do not have permission to perform this action.')
      }

      const resolvedTenantId = await resolveClientTenantId(
        (newStore.tenant_id as string | undefined) || undefined
      )
      if (!resolvedTenantId) {
        throw new Error(
          'Tenant ID could not be identified. Please ensure you are logged in.'
        )
      }

      const { userId } = getAuthTenantAndUser()

      // Strip obsolete or unaccepted columns such as auth_user_id and joins
      const {
        auth_user_id: _deprecatedAuthUserId,
        cities: _citiesJoin,
        branches: _branchesJoin,
        countries: _countriesJoin,
        ...rest
      } = newStore

      const payload: Record<string, unknown> = {
        ...rest,
        tenant_id: resolvedTenantId,
        branch_id: rest.branch_id || null,
        city_id: rest.city_id || null,
        country_id: rest.country_id || null,
        phone: typeof rest.phone === 'string' ? rest.phone.trim() || null : rest.phone ?? null,
        email: typeof rest.email === 'string' ? rest.email.trim() || null : rest.email ?? null,
        address: typeof rest.address === 'string' ? rest.address.trim() || null : rest.address ?? null,
      }

      if (userId && isValidUuid(userId)) {
        payload.created_by_user_id = userId
        payload.updated_by_user_id = userId
      }

      const { data, error } = await supabase
        .from('stores')
        .insert(payload)
        .select()
        .maybeSingle()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] })
    },
  })
}

export const useUpdateStore = () => {
  const { has } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      store_id,
      ...updates
    }: Partial<Store> & { store_id: string } & Record<string, unknown>) => {
      if (!has({ permission: 'settings.manage' })) {
        throw new Error('You do not have permission to perform this action.')
      }

      const { tenantId, userId } = getAuthTenantAndUser()

      // Strip obsolete or non-updatable fields
      const {
        auth_user_id: _deprecatedAuthUserId,
        tenant_id: _tenantId,
        cities: _citiesJoin,
        branches: _branchesJoin,
        countries: _countriesJoin,
        created_at: _createdAt,
        ...rest
      } = updates

      const payload: Record<string, unknown> = {
        ...rest,
        branch_id: rest.branch_id !== undefined ? rest.branch_id || null : undefined,
        city_id: rest.city_id !== undefined ? rest.city_id || null : undefined,
        country_id: rest.country_id !== undefined ? rest.country_id || null : undefined,
      }

      // Remove undefined keys
      Object.keys(payload).forEach((key) => {
        if (payload[key] === undefined) {
          delete payload[key]
        }
      })

      if (userId && isValidUuid(userId)) {
        payload.updated_by_user_id = userId
      }

      let query = supabase
        .from('stores')
        .update(payload)
        .eq('store_id', store_id)

      if (tenantId && isValidUuid(tenantId)) {
        query = query.eq('tenant_id', tenantId)
      }

      const { data, error } = await query
        .select()
        .maybeSingle()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] })
    },
  })
}

export const useDeleteStore = () => {
  const { has } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      if (!has({ permission: 'settings.manage' })) {
        throw new Error('You do not have permission to perform this action.')
      }

      const { tenantId } = getAuthTenantAndUser()
      let query = supabase.from('stores').delete().eq('store_id', id)

      if (tenantId && isValidUuid(tenantId)) {
        query = query.eq('tenant_id', tenantId)
      }

      const { error } = await query
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] })
    },
  })
}

