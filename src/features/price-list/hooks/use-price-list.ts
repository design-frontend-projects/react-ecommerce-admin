import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
import { useAuth } from '@/hooks/use-auth'
import { useAuthEnabled } from '@/hooks/use-auth-query'
import type {
  PriceList,
  PriceListFormData,
  PriceListType,
  ProductBrief,
  CustomerGroupBrief,
  StoreBrief,
  CurrencyBrief,
  ChannelBrief,
} from '../data/schema'

export interface PriceListFilters {
  search?: string
  type?: PriceListType | 'all'
  store_id?: string | 'all'
  group_id?: string | 'all'
  channel_id?: string | 'all'
  is_active?: boolean | 'all'
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

const PRICE_LIST_SELECT_QUERY = `
  *,
  products (
    id,
    name,
    sku,
    has_variants
  ),
  customer_groups (
    id,
    name,
    discount_percentage
  ),
  stores (
    store_id,
    name
  ),
  currencies (
    id,
    name,
    code,
    symbol
  ),
  channels (
    id,
    code,
    name,
    name_ar
  ),
  price_list_items (
    id,
    price_list_id,
    product_variant_id,
    product_id,
    price,
    cost_price,
    min_price,
    max_discount_percent,
    created_at,
    updated_at,
    product_variants (
      id,
      product_id,
      name,
      sku,
      barcode
    )
  )
`

export const usePriceList = (filters?: PriceListFilters) => {
  const { authEnabled } = useAuthEnabled({ permission: 'sales.view' })

  return useQuery({
    queryKey: ['price-list', filters],
    queryFn: async () => {
      const { tenantId } = getAuthTenantAndUser()
      let query = supabase
        .from('price_list')
        .select(PRICE_LIST_SELECT_QUERY)

      if (tenantId) {
        query = query.eq('tenant_id', tenantId)
      }

      if (filters?.type && filters.type !== 'all') {
        query = query.eq('type', filters.type)
      }

      if (filters?.store_id && filters.store_id !== 'all') {
        query = query.eq('store_id', filters.store_id)
      }

      if (filters?.group_id && filters.group_id !== 'all') {
        query = query.eq('group_id', filters.group_id)
      }

      if (filters?.is_active !== undefined && filters.is_active !== 'all') {
        query = query.eq('is_active', filters.is_active)
      }

      if (filters?.channel_id && filters.channel_id !== 'all') {
        query = query.eq('channel_id', filters.channel_id)
      }

      const { data, error } = await query.order('start_date', { ascending: false })

      if (error) throw error

      let result = (data || []) as unknown as PriceList[]

      // In-memory search filter if specified
      if (filters?.search) {
        const queryTerm = filters.search.toLowerCase()
        result = result.filter((item) => {
          const productName = item.products?.name?.toLowerCase() || ''
          const productSku = item.products?.sku?.toLowerCase() || ''
          const description = item.description?.toLowerCase() || ''
          const customerGroupName = item.customer_groups?.name?.toLowerCase() || ''
          const storeName = item.stores?.name?.toLowerCase() || ''

          return (
            productName.includes(queryTerm) ||
            productSku.includes(queryTerm) ||
            description.includes(queryTerm) ||
            customerGroupName.includes(queryTerm) ||
            storeName.includes(queryTerm)
          )
        })
      }

      return result
    },
    enabled: authEnabled,
  })
}

export const usePriceListById = (id?: string | null) => {
  const { authEnabled } = useAuthEnabled({ permission: 'sales.view' })

  return useQuery({
    queryKey: ['price-list', id],
    queryFn: async () => {
      if (!id) return null
      const { data, error } = await supabase
        .from('price_list')
        .select(PRICE_LIST_SELECT_QUERY)
        .eq('id', id)
        .maybeSingle()

      if (error) throw error
      return data as unknown as PriceList | null
    },
    enabled: Boolean(id) && authEnabled,
  })
}

export const usePriceListOptions = () => {
  const { authEnabled } = useAuthEnabled({ permission: 'sales.view' })

  return useQuery({
    queryKey: ['price-list-options'],
    queryFn: async () => {
      const { tenantId } = getAuthTenantAndUser()

      let productsQuery = supabase
        .from('products')
        .select(`
          id,
          name,
          sku,
          has_variants,
          product_variants (
            id,
            product_id,
            name,
            sku,
            barcode,
            is_active
          )
        `)
        .neq('is_deleted', true)
        .order('name')

      let groupsQuery = supabase
        .from('customer_groups')
        .select('id, name, discount_percentage, minimum_order_amount')
        .order('name')

      let storesQuery = supabase
        .from('stores')
        .select('store_id, name, phone, email')
        .order('name')

      const currenciesQuery = supabase
        .from('currencies')
        .select('id, name, code, symbol')
        .eq('is_active', true)
        .order('name')

      let channelsQuery = supabase
        .from('channels')
        .select('id, code, name, name_ar')
        .eq('is_active', true)
        .order('name')

      if (tenantId) {
        productsQuery = productsQuery.eq('tenant_id', tenantId)
        groupsQuery = groupsQuery.eq('tenant_id', tenantId)
        storesQuery = storesQuery.eq('tenant_id', tenantId)
        channelsQuery = channelsQuery.eq('tenant_id', tenantId)
      }

      const [productsRes, groupsRes, storesRes, currenciesRes, channelsRes] = await Promise.all([
        productsQuery,
        groupsQuery,
        storesQuery,
        currenciesQuery,
        channelsQuery,
      ])

      if (productsRes.error) throw productsRes.error
      if (groupsRes.error) throw groupsRes.error
      if (storesRes.error) throw storesRes.error
      if (currenciesRes.error) throw currenciesRes.error
      if (channelsRes.error) throw channelsRes.error

      return {
        products: (productsRes.data || []) as unknown as ProductBrief[],
        customerGroups: (groupsRes.data || []) as unknown as CustomerGroupBrief[],
        stores: (storesRes.data || []) as unknown as StoreBrief[],
        currencies: (currenciesRes.data || []) as unknown as CurrencyBrief[],
        channels: (channelsRes.data || []) as unknown as ChannelBrief[],
      }
    },
    enabled: authEnabled,
  })
}

export const useCreatePriceListWithItems = () => {
  const queryClient = useQueryClient()
  const { has } = useAuth()

  return useMutation({
    mutationFn: async (formData: PriceListFormData) => {
      if (!has({ permission: 'sales.manage' })) {
        throw new Error('You do not have permission to perform this action.')
      }

      const { tenantId, userId } = getAuthTenantAndUser()
      if (!tenantId) {
        throw new Error('Tenant ID could not be identified.')
      }

      if (formData.is_default) {
        await supabase
          .from('price_list')
          .update({ is_default: false })
          .eq('tenant_id', tenantId)
      }

      const headerPayload = {
        tenant_id: tenantId,
        name: formData.name,
        code: formData.code || null,
        is_default: formData.is_default ?? false,
        product_id: formData.product_id ? formData.product_id : null,
        price: formData.price !== undefined && formData.price !== null ? formData.price : null,
        type: formData.type || null,
        group_id: formData.group_id ? formData.group_id : null,
        store_id: formData.store_id ? formData.store_id : null,
        currency_id: formData.currency_id ? formData.currency_id : null,
        channel_id: formData.channel_id ? formData.channel_id : null,
        start_date: formData.start_date,
        end_date: formData.end_date ? formData.end_date : null,
        is_active: formData.is_active ?? true,
        description: formData.description || null,
        created_by_user_id: userId,
        updated_by_user_id: userId,
      }

      // 1. Insert header
      const { data: headerData, error: headerError } = await supabase
        .from('price_list')
        .insert(headerPayload)
        .select()
        .single()

      if (headerError) throw headerError
      if (!headerData) throw new Error('Failed to create price list header.')

      const priceListId = headerData.id as string

      // 2. Insert line items if present
      if (formData.items && formData.items.length > 0) {
        const itemsPayload = formData.items.map((item) => ({
          tenant_id: tenantId,
          price_list_id: priceListId,
          product_variant_id: item.product_variant_id,
          price: item.price,
          cost_price: item.cost_price ?? 0,
          min_price: item.min_price ?? 0,
          max_discount_percent: item.max_discount_percent ?? 0,
          created_by_user_id: userId,
          updated_by_user_id: userId,
        }))

        const { error: itemsError } = await supabase
          .from('price_list_items')
          .insert(itemsPayload)

        if (itemsError) {
          // Cleanup header if items insertion failed
          await supabase.from('price_list').delete().eq('id', priceListId)
          throw itemsError
        }
      }

      return headerData
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-list'] })
      queryClient.invalidateQueries({ queryKey: ['price-lists'] })
      queryClient.invalidateQueries({ queryKey: ['default-price-list'] })
    },
  })
}

export const useUpdatePriceListWithItems = () => {
  const queryClient = useQueryClient()
  const { has } = useAuth()

  return useMutation({
    mutationFn: async ({
      id,
      ...formData
    }: PriceListFormData & { id: string }) => {
      if (!has({ permission: 'sales.manage' })) {
        throw new Error('You do not have permission to perform this action.')
      }

      const { tenantId, userId } = getAuthTenantAndUser()

      if (formData.is_default && tenantId) {
        await supabase
          .from('price_list')
          .update({ is_default: false })
          .eq('tenant_id', tenantId)
          .neq('id', id)
      }

      const headerUpdatePayload = {
        name: formData.name,
        code: formData.code || null,
        is_default: formData.is_default ?? false,
        product_id: formData.product_id ? formData.product_id : null,
        price: formData.price !== undefined && formData.price !== null ? formData.price : null,
        type: formData.type || null,
        group_id: formData.group_id ? formData.group_id : null,
        store_id: formData.store_id ? formData.store_id : null,
        currency_id: formData.currency_id ? formData.currency_id : null,
        channel_id: formData.channel_id ? formData.channel_id : null,
        start_date: formData.start_date,
        end_date: formData.end_date ? formData.end_date : null,
        is_active: formData.is_active ?? true,
        description: formData.description || null,
        updated_by_user_id: userId,
      }

      // 1. Update header
      const { error: headerError } = await supabase
        .from('price_list')
        .update(headerUpdatePayload)
        .eq('id', id)

      if (headerError) throw headerError

      // 2. Fetch existing items for this price list to reconcile
      const { data: existingItems, error: fetchItemsError } = await supabase
        .from('price_list_items')
        .select('id, product_variant_id')
        .eq('price_list_id', id)

      if (fetchItemsError) throw fetchItemsError

      const existingVariantMap = new Map<string, string>() // variant_id -> item_id
      existingItems?.forEach((item) => {
        existingVariantMap.set(item.product_variant_id, item.id)
      })

      const incomingVariantIds = new Set(formData.items.map((i) => i.product_variant_id))

      // Items to delete (exist in DB but not in incoming form)
      const itemIdsToDelete = existingItems
        ?.filter((item) => !incomingVariantIds.has(item.product_variant_id))
        .map((item) => item.id) || []

      if (itemIdsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('price_list_items')
          .delete()
          .in('id', itemIdsToDelete)

        if (deleteError) throw deleteError
      }

      // Reconcile items to insert vs update
      const itemsToInsert: Record<string, unknown>[] = []
      const itemsToUpdate: Array<{ id: string; payload: Record<string, unknown> }> = []

      formData.items.forEach((item) => {
        const existingItemId = existingVariantMap.get(item.product_variant_id)
        if (existingItemId) {
          itemsToUpdate.push({
            id: existingItemId,
            payload: {
              price: item.price,
              cost_price: item.cost_price ?? 0,
              min_price: item.min_price ?? 0,
              max_discount_percent: item.max_discount_percent ?? 0,
              updated_by_user_id: userId,
            },
          })
        } else {
          itemsToInsert.push({
            tenant_id: tenantId,
            price_list_id: id,
            product_variant_id: item.product_variant_id,
            price: item.price,
            cost_price: item.cost_price ?? 0,
            min_price: item.min_price ?? 0,
            max_discount_percent: item.max_discount_percent ?? 0,
            created_by_user_id: userId,
            updated_by_user_id: userId,
          })
        }
      })

      // Execute updates
      for (const updateOp of itemsToUpdate) {
        const { error: updateError } = await supabase
          .from('price_list_items')
          .update(updateOp.payload)
          .eq('id', updateOp.id)

        if (updateError) throw updateError
      }

      // Execute inserts
      if (itemsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('price_list_items')
          .insert(itemsToInsert)

        if (insertError) throw insertError
      }

      return { id }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-list'] })
      queryClient.invalidateQueries({ queryKey: ['price-lists'] })
      queryClient.invalidateQueries({ queryKey: ['default-price-list'] })
    },
  })
}

export const useDeletePriceList = () => {
  const queryClient = useQueryClient()
  const { has } = useAuth()

  return useMutation({
    mutationFn: async (id: string) => {
      if (!has({ permission: 'sales.manage' })) {
        throw new Error('You do not have permission to perform this action.')
      }

      // With CASCADE, deleting the price_list removes its price_list_items
      const { error } = await supabase
        .from('price_list')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-list'] })
      queryClient.invalidateQueries({ queryKey: ['price-lists'] })
      queryClient.invalidateQueries({ queryKey: ['default-price-list'] })
    },
  })
}

export const useDefaultPriceList = () => {
  const { authEnabled } = useAuthEnabled({ permission: 'sales.view' })

  return useQuery({
    queryKey: ['default-price-list'],
    queryFn: async () => {
      const { tenantId } = getAuthTenantAndUser()
      let query = supabase
        .from('price_list')
        .select(`
          *,
          price_list_items (
            id,
            price_list_id,
            product_variant_id,
            product_id,
            price,
            cost_price,
            min_price,
            max_discount_percent
          )
        `)
        .eq('is_default', true)
        .eq('is_active', true)

      if (tenantId) {
        query = query.eq('tenant_id', tenantId)
      }

      const { data, error } = await query.maybeSingle()
      if (error) throw error
      return data as PriceList | null
    },
    enabled: authEnabled,
  })
}
