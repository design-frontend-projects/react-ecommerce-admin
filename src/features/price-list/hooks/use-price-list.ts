import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import i18n from 'i18next'
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
  TaxRateBrief,
} from '../data/schema'

export interface VariantCostValuation {
  lastPurchaseCost: number
  averageCost: number
  lastReceiptNumber?: string
  lastReceiptDate?: string
}

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
  tax_rates (
    id,
    tax_type,
    rate,
    is_inclusive,
    description
  ),
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
    tax_id,
    price_source,
    markup_percent,
    created_at,
    updated_at,
    tax_rates (
      id,
      tax_type,
      rate,
      is_inclusive,
      description
    ),
    product_variants (
      id,
      product_id,
      name,
      sku,
      barcode
    ),
    products (
      id,
      name,
      sku
    )
  ),
  price_list_assignments (
    id,
    tenant_id,
    price_list_id,
    store_id,
    channel_id,
    customer_group_id,
    assignment_type,
    priority,
    is_default,
    is_active,
    valid_from,
    valid_to,
    stores (
      store_id,
      name
    ),
    channels (
      id,
      code,
      name
    ),
    customer_groups (
      id,
      name
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
            is_active,
            price_list_items (
              price,
              cost_price
            )
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

      let taxRatesQuery = supabase
        .from('tax_rates')
        .select('id, tax_type, rate, description, is_inclusive, is_active')
        .eq('is_active', true)
        .order('tax_type')

      // Variant cost valuations:
      // 1. Goods receipt items for last purchase cost
      const grQuery = supabase
        .from('goods_receipt_items')
        .select(`
          product_variant_id,
          unit_cost,
          created_at,
          goods_receipts (
            id,
            receipt_number,
            received_date,
            status,
            tenant_id
          )
        `)
        .order('created_at', { ascending: false })
        .limit(1000)

      // 2. Stock balances for weighted average cost
      let sbQuery = supabase
        .from('stock_balances')
        .select('product_variant_id, avg_cost, qty_on_hand')

      if (tenantId) {
        productsQuery = productsQuery.eq('tenant_id', tenantId)
        groupsQuery = groupsQuery.eq('tenant_id', tenantId)
        storesQuery = storesQuery.eq('tenant_id', tenantId)
        channelsQuery = channelsQuery.eq('tenant_id', tenantId)
        taxRatesQuery = taxRatesQuery.eq('tenant_id', tenantId)
        sbQuery = sbQuery.eq('tenant_id', tenantId)
      }

      const [productsRes, groupsRes, storesRes, currenciesRes, channelsRes, taxRatesRes, grRes, sbRes] =
        await Promise.all([
          productsQuery,
          groupsQuery,
          storesQuery,
          currenciesQuery,
          channelsQuery,
          taxRatesQuery,
          Promise.resolve(grQuery).catch(() => ({ data: null, error: null })),
          Promise.resolve(sbQuery).catch(() => ({ data: null, error: null })),
        ])

      if (productsRes.error) throw productsRes.error
      if (groupsRes.error) throw groupsRes.error
      if (storesRes.error) throw storesRes.error
      if (currenciesRes.error) throw currenciesRes.error
      if (channelsRes.error) throw channelsRes.error
      if (taxRatesRes.error) throw taxRatesRes.error

      const variantCosts: Record<string, VariantCostValuation> = {}

      if (grRes.data && Array.isArray(grRes.data)) {
        for (const item of grRes.data as any[]) {
          const vid = item.product_variant_id
          if (!vid) continue
          if (!variantCosts[vid]) {
            variantCosts[vid] = {
              lastPurchaseCost: Number(item.unit_cost) || 0,
              averageCost: 0,
              lastReceiptNumber: item.goods_receipts?.receipt_number || undefined,
              lastReceiptDate: item.goods_receipts?.received_date || undefined,
            }
          }
        }
      }

      if (sbRes.data && Array.isArray(sbRes.data)) {
        const sbAgg: Record<string, { totalVal: number; totalQty: number; fallbackAvg: number }> = {}
        for (const sb of sbRes.data as any[]) {
          const vid = sb.product_variant_id
          if (!vid) continue
          const qty = Math.max(0, Number(sb.qty_on_hand) || 0)
          const cost = Number(sb.avg_cost) || 0
          if (!sbAgg[vid]) {
            sbAgg[vid] = { totalVal: 0, totalQty: 0, fallbackAvg: cost }
          }
          sbAgg[vid].totalVal += cost * qty
          sbAgg[vid].totalQty += qty
          if (cost > 0) sbAgg[vid].fallbackAvg = cost
        }

        for (const [vid, agg] of Object.entries(sbAgg)) {
          const avg = agg.totalQty > 0 ? agg.totalVal / agg.totalQty : agg.fallbackAvg
          if (!variantCosts[vid]) {
            variantCosts[vid] = {
              lastPurchaseCost: 0,
              averageCost: Number(avg.toFixed(4)),
            }
          } else {
            variantCosts[vid].averageCost = Number(avg.toFixed(4))
          }
        }
      }

      return {
        products: (productsRes.data || []) as unknown as ProductBrief[],
        customerGroups: (groupsRes.data || []) as unknown as CustomerGroupBrief[],
        stores: (storesRes.data || []) as unknown as StoreBrief[],
        currencies: (currenciesRes.data || []) as unknown as CurrencyBrief[],
        channels: (channelsRes.data || []) as unknown as ChannelBrief[],
        taxRates: (taxRatesRes.data || []) as unknown as TaxRateBrief[],
        variantCosts,
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
        throw new Error(
          i18n.t('priceList.validation.noPermission', {
            defaultValue: 'You do not have permission to perform this action.',
          })
        )
      }

      const { tenantId, userId } = getAuthTenantAndUser()
      if (!tenantId) {
        throw new Error(
          i18n.t('priceList.validation.tenantNotFound', {
            defaultValue: 'Tenant ID could not be identified.',
          })
        )
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
        product_id: formData.product_id ? formData.product_id : (formData.items?.[0]?.product_id || null),
        price: formData.price !== undefined && formData.price !== null ? formData.price : null,
        type: formData.type || null,
        group_id: formData.group_id ? formData.group_id : null,
        store_id: formData.store_id ? formData.store_id : null,
        currency_id: formData.currency_id ? formData.currency_id : null,
        channel_id: formData.channel_id ? formData.channel_id : null,
        tax_id: formData.tax_id ? formData.tax_id : null,
        price_source: formData.price_source || 'MANUAL',
        markup_percent: formData.markup_percent !== undefined && formData.markup_percent !== null ? formData.markup_percent : 0,
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
      if (!headerData) {
        throw new Error(
          i18n.t('priceList.validation.failedCreate', {
            defaultValue: 'Failed to create price list header.',
          })
        )
      }

      const priceListId = headerData.id as string

      // 2. Insert line items if present
      if (formData.items && formData.items.length > 0) {
        const itemsPayload = formData.items.map((item) => ({
          tenant_id: tenantId,
          price_list_id: priceListId,
          product_id: item.product_id || null,
          product_variant_id: item.product_variant_id,
          price: item.price,
          cost_price: item.cost_price ?? 0,
          min_price: item.min_price ?? 0,
          max_discount_percent: item.max_discount_percent ?? 0,
          tax_id: item.tax_id ? item.tax_id : (formData.tax_id || null),
          price_source: item.price_source || formData.price_source || 'MANUAL',
          markup_percent: item.markup_percent !== undefined && item.markup_percent !== null ? item.markup_percent : 0,
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

      // 3. Insert price_list_assignments
      const storeIds = Array.from(
        new Set([
          ...(formData.assigned_store_ids || []),
          ...(formData.store_id ? [formData.store_id] : []),
        ])
      )

      const assignmentsPayload: Record<string, unknown>[] = []

      if (storeIds.length > 0) {
        for (const sId of storeIds) {
          assignmentsPayload.push({
            tenant_id: tenantId,
            price_list_id: priceListId,
            store_id: sId,
            channel_id: formData.channel_id || null,
            customer_group_id: formData.group_id || null,
            assignment_type:
              formData.channel_id && formData.group_id
                ? 'STORE_CHANNEL_CUSTOMER_GROUP'
                : formData.channel_id
                ? 'STORE_CHANNEL'
                : formData.group_id
                ? 'STORE_CUSTOMER_GROUP'
                : 'STORE',
            priority: formData.priority ?? 100,
            is_default: formData.is_default ?? false,
            is_active: formData.is_active ?? true,
            valid_from: formData.start_date,
            valid_to: formData.end_date || null,
            created_by_user_id: userId,
            updated_by_user_id: userId,
          })
        }
      } else if (formData.channel_id || formData.group_id || formData.is_default) {
        assignmentsPayload.push({
          tenant_id: tenantId,
          price_list_id: priceListId,
          store_id: null,
          channel_id: formData.channel_id || null,
          customer_group_id: formData.group_id || null,
          assignment_type:
            formData.channel_id && formData.group_id
              ? 'CHANNEL_CUSTOMER_GROUP'
              : formData.channel_id
              ? 'CHANNEL'
              : formData.group_id
              ? 'CUSTOMER_GROUP'
              : 'GLOBAL',
          priority: formData.priority ?? 100,
          is_default: formData.is_default ?? false,
          is_active: formData.is_active ?? true,
          valid_from: formData.start_date,
          valid_to: formData.end_date || null,
          created_by_user_id: userId,
          updated_by_user_id: userId,
        })
      }

      if (assignmentsPayload.length > 0) {
        await supabase.from('price_list_assignments').insert(assignmentsPayload)
      }

      return headerData
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-list'] })
      queryClient.invalidateQueries({ queryKey: ['price-lists'] })
      queryClient.invalidateQueries({ queryKey: ['price-list-assignments'] })
      queryClient.invalidateQueries({ queryKey: ['store-price-lists'] })
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
        throw new Error(
          i18n.t('priceList.validation.noPermission', {
            defaultValue: 'You do not have permission to perform this action.',
          })
        )
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
        product_id: formData.product_id ? formData.product_id : (formData.items?.[0]?.product_id || null),
        price: formData.price !== undefined && formData.price !== null ? formData.price : null,
        type: formData.type || null,
        group_id: formData.group_id ? formData.group_id : null,
        store_id: formData.store_id ? formData.store_id : null,
        currency_id: formData.currency_id ? formData.currency_id : null,
        channel_id: formData.channel_id ? formData.channel_id : null,
        tax_id: formData.tax_id ? formData.tax_id : null,
        price_source: formData.price_source || 'MANUAL',
        markup_percent: formData.markup_percent !== undefined && formData.markup_percent !== null ? formData.markup_percent : 0,
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
              product_id: item.product_id || null,
              price: item.price,
              cost_price: item.cost_price ?? 0,
              min_price: item.min_price ?? 0,
              max_discount_percent: item.max_discount_percent ?? 0,
              tax_id: item.tax_id ? item.tax_id : (formData.tax_id || null),
              price_source: item.price_source || formData.price_source || 'MANUAL',
              markup_percent: item.markup_percent !== undefined && item.markup_percent !== null ? item.markup_percent : 0,
              updated_by_user_id: userId,
            },
          })
        } else {
          itemsToInsert.push({
            tenant_id: tenantId,
            price_list_id: id,
            product_id: item.product_id || null,
            product_variant_id: item.product_variant_id,
            price: item.price,
            cost_price: item.cost_price ?? 0,
            min_price: item.min_price ?? 0,
            max_discount_percent: item.max_discount_percent ?? 0,
            tax_id: item.tax_id ? item.tax_id : (formData.tax_id || null),
            price_source: item.price_source || formData.price_source || 'MANUAL',
            markup_percent: item.markup_percent !== undefined && item.markup_percent !== null ? item.markup_percent : 0,
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

      // 3. Reconcile price_list_assignments
      const storeIds = Array.from(
        new Set([
          ...(formData.assigned_store_ids || []),
          ...(formData.store_id ? [formData.store_id] : []),
        ])
      )

      await supabase
        .from('price_list_assignments')
        .delete()
        .eq('price_list_id', id)

      const updateAssignmentsPayload: Record<string, unknown>[] = []

      if (storeIds.length > 0) {
        for (const sId of storeIds) {
          updateAssignmentsPayload.push({
            tenant_id: tenantId,
            price_list_id: id,
            store_id: sId,
            channel_id: formData.channel_id || null,
            customer_group_id: formData.group_id || null,
            assignment_type:
              formData.channel_id && formData.group_id
                ? 'STORE_CHANNEL_CUSTOMER_GROUP'
                : formData.channel_id
                ? 'STORE_CHANNEL'
                : formData.group_id
                ? 'STORE_CUSTOMER_GROUP'
                : 'STORE',
            priority: formData.priority ?? 100,
            is_default: formData.is_default ?? false,
            is_active: formData.is_active ?? true,
            valid_from: formData.start_date,
            valid_to: formData.end_date || null,
            created_by_user_id: userId,
            updated_by_user_id: userId,
          })
        }
      } else if (formData.channel_id || formData.group_id || formData.is_default) {
        updateAssignmentsPayload.push({
          tenant_id: tenantId,
          price_list_id: id,
          store_id: null,
          channel_id: formData.channel_id || null,
          customer_group_id: formData.group_id || null,
          assignment_type:
            formData.channel_id && formData.group_id
              ? 'CHANNEL_CUSTOMER_GROUP'
              : formData.channel_id
              ? 'CHANNEL'
              : formData.group_id
              ? 'CUSTOMER_GROUP'
              : 'GLOBAL',
          priority: formData.priority ?? 100,
          is_default: formData.is_default ?? false,
          is_active: formData.is_active ?? true,
          valid_from: formData.start_date,
          valid_to: formData.end_date || null,
          created_by_user_id: userId,
          updated_by_user_id: userId,
        })
      }

      if (updateAssignmentsPayload.length > 0) {
        await supabase.from('price_list_assignments').insert(updateAssignmentsPayload)
      }

      return { id }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-list'] })
      queryClient.invalidateQueries({ queryKey: ['price-lists'] })
      queryClient.invalidateQueries({ queryKey: ['price-list-assignments'] })
      queryClient.invalidateQueries({ queryKey: ['store-price-lists'] })
      queryClient.invalidateQueries({ queryKey: ['default-price-list'] })
    },
  })
}

export const useStorePriceLists = (storeId?: string | null) => {
  const { authEnabled } = useAuthEnabled({ permission: 'sales.view' })

  return useQuery({
    queryKey: ['store-price-lists', storeId],
    queryFn: async () => {
      if (!storeId) return []
      const { tenantId } = getAuthTenantAndUser()
      let query = supabase
        .from('price_list_assignments')
        .select(`
          id,
          tenant_id,
          price_list_id,
          store_id,
          channel_id,
          customer_group_id,
          assignment_type,
          priority,
          is_default,
          is_active,
          valid_from,
          valid_to,
          price_list:price_list (
            id,
            name,
            code,
            type,
            currency_id,
            is_default,
            is_active
          )
        `)
        .eq('store_id', storeId)
        .eq('is_active', true)
        .order('priority', { ascending: true })

      if (tenantId) {
        query = query.eq('tenant_id', tenantId)
      }

      const { data, error } = await query
      if (error) throw error
      return data || []
    },
    enabled: Boolean(storeId) && authEnabled,
  })
}

export const useAssignStorePriceList = () => {
  const queryClient = useQueryClient()
  const { has } = useAuth()

  return useMutation({
    mutationFn: async ({
      storeId,
      priceListId,
      priority = 100,
      isDefault = false,
      channelId,
      customerGroupId,
      validFrom,
      validTo,
    }: {
      storeId: string
      priceListId: string
      priority?: number
      isDefault?: boolean
      channelId?: string | null
      customerGroupId?: string | null
      validFrom?: string | null
      validTo?: string | null
    }) => {
      if (!has({ permission: 'sales.manage' })) {
        throw new Error(
          i18n.t('priceList.validation.noPermission', {
            defaultValue: 'You do not have permission to perform this action.',
          })
        )
      }
      const { tenantId, userId } = getAuthTenantAndUser()
      if (!tenantId) throw new Error('Tenant context missing')

      const { data, error } = await supabase
        .from('price_list_assignments')
        .insert({
          tenant_id: tenantId,
          price_list_id: priceListId,
          store_id: storeId,
          channel_id: channelId || null,
          customer_group_id: customerGroupId || null,
          assignment_type:
            channelId && customerGroupId
              ? 'STORE_CHANNEL_CUSTOMER_GROUP'
              : channelId
              ? 'STORE_CHANNEL'
              : customerGroupId
              ? 'STORE_CUSTOMER_GROUP'
              : 'STORE',
          priority,
          is_default: isDefault,
          is_active: true,
          valid_from: validFrom || null,
          valid_to: validTo || null,
          created_by_user_id: userId,
          updated_by_user_id: userId,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['store-price-lists', vars.storeId] })
      queryClient.invalidateQueries({ queryKey: ['price-list'] })
      queryClient.invalidateQueries({ queryKey: ['price-lists'] })
      queryClient.invalidateQueries({ queryKey: ['price-list-assignments'] })
    },
  })
}

export const useRemoveStorePriceList = () => {
  const queryClient = useQueryClient()
  const { has } = useAuth()

  return useMutation({
    mutationFn: async ({
      assignmentId,
    }: {
      assignmentId: string
      storeId: string
    }) => {
      if (!has({ permission: 'sales.manage' })) {
        throw new Error(
          i18n.t('priceList.validation.noPermission', {
            defaultValue: 'You do not have permission to perform this action.',
          })
        )
      }
      const { error } = await supabase
        .from('price_list_assignments')
        .delete()
        .eq('id', assignmentId)

      if (error) throw error
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['store-price-lists', vars.storeId] })
      queryClient.invalidateQueries({ queryKey: ['price-list'] })
      queryClient.invalidateQueries({ queryKey: ['price-lists'] })
      queryClient.invalidateQueries({ queryKey: ['price-list-assignments'] })
    },
  })
}

export const useDeletePriceList = () => {
  const queryClient = useQueryClient()
  const { has } = useAuth()

  return useMutation({
    mutationFn: async (id: string) => {
      if (!has({ permission: 'sales.manage' })) {
        throw new Error(
          i18n.t('priceList.validation.noPermission', {
            defaultValue: 'You do not have permission to perform this action.',
          })
        )
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
