import type { SupabaseClient } from '@supabase/supabase-js'

export interface PriceResolutionContext {
  tenantId?: string | null
  variantId: string
  productId?: string | null
  storeId?: string | null
  channelId?: string | null
  customerGroupId?: string | null
  currencyId?: string | null
  quantity?: number
  fallbackPrice?: number
}

export interface ResolvedPrice {
  price: number
  minPrice: number
  costPrice: number
  maxDiscountPercent: number
  priceListId: string | null
  priceListName: string | null
  priceListType: string | null
  source: 'customer_group' | 'channel' | 'store' | 'default' | 'fallback'
}

export interface PriceListItemWithList {
  id: string
  price_list_id: string
  product_variant_id: string
  product_id?: string | null
  price: number | string
  cost_price?: number | string | null
  min_price?: number | string | null
  max_discount_percent?: number | string | null
  price_list?: {
    id: string
    name?: string | null
    code?: string | null
    type?: string | null
    is_default?: boolean | null
    is_active?: boolean | null
    store_id?: string | null
    channel_id?: string | null
    group_id?: string | null
    currency_id?: string | null
    start_date?: string | null
    end_date?: string | null
  } | null
}

/**
 * Synchronously resolves the best price for a variant given an in-memory array of price list items
 * matching the context (customer group, channel, store, or default).
 */
export function resolvePriceFromListItems(
  items: PriceListItemWithList[],
  context: PriceResolutionContext
): ResolvedPrice {
  if (!items || items.length === 0) {
    return {
      price: context.fallbackPrice ?? 0,
      minPrice: 0,
      costPrice: 0,
      maxDiscountPercent: 0,
      priceListId: null,
      priceListName: null,
      priceListType: null,
      source: 'fallback',
    }
  }

  const now = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

  // Filter only items from active price lists within validity dates
  const activeItems = items.filter((item) => {
    const pl = Array.isArray(item.price_list) ? item.price_list[0] : item.price_list
    if (!pl) return true // if joined list omitted, consider item valid
    if (pl.is_active === false) return false
    if (pl.start_date && pl.start_date > now) return false
    if (pl.end_date && pl.end_date < now) return false
    if (context.currencyId && pl.currency_id && pl.currency_id !== context.currencyId) {
      return false
    }
    return true
  })

  if (activeItems.length === 0) {
    return {
      price: context.fallbackPrice ?? 0,
      minPrice: 0,
      costPrice: 0,
      maxDiscountPercent: 0,
      priceListId: null,
      priceListName: null,
      priceListType: null,
      source: 'fallback',
    }
  }

  const candidates = activeItems

  // Priority 1: Specific customer group match
  if (context.customerGroupId) {
    const groupMatch = candidates.find((i) => {
      const pl = Array.isArray(i.price_list) ? i.price_list[0] : i.price_list
      return pl?.group_id === context.customerGroupId
    })
    if (groupMatch) {
      return formatResolvedPrice(groupMatch, 'customer_group')
    }
  }

  // Priority 2: Specific sales channel match
  if (context.channelId) {
    const channelMatch = candidates.find((i) => {
      const pl = Array.isArray(i.price_list) ? i.price_list[0] : i.price_list
      return pl?.channel_id === context.channelId
    })
    if (channelMatch) {
      return formatResolvedPrice(channelMatch, 'channel')
    }
  }

  // Priority 3: Specific store match
  if (context.storeId) {
    const storeMatch = candidates.find((i) => {
      const pl = Array.isArray(i.price_list) ? i.price_list[0] : i.price_list
      return pl?.store_id === context.storeId
    })
    if (storeMatch) {
      return formatResolvedPrice(storeMatch, 'store')
    }
  }

  // Priority 4: Default price list
  const defaultMatch = candidates.find((i) => {
    const pl = Array.isArray(i.price_list) ? i.price_list[0] : i.price_list
    return pl?.is_default === true
  })
  if (defaultMatch) {
    return formatResolvedPrice(defaultMatch, 'default')
  }

  // Priority 5: Any first candidate
  return formatResolvedPrice(candidates[0], 'fallback')
}

function formatResolvedPrice(
  item: PriceListItemWithList,
  source: ResolvedPrice['source']
): ResolvedPrice {
  const pl = Array.isArray(item.price_list) ? item.price_list[0] : item.price_list
  return {
    price: Number(item.price || 0),
    minPrice: Number(item.min_price || 0),
    costPrice: Number(item.cost_price || 0),
    maxDiscountPercent: Number(item.max_discount_percent || 0),
    priceListId: item.price_list_id,
    priceListName: pl?.name || pl?.code || null,
    priceListType: pl?.type || null,
    source,
  }
}

/**
 * Asynchronously queries Supabase to resolve the variant price with full cascading hierarchy.
 */
export async function resolveVariantPrice(
  supabase: SupabaseClient,
  context: PriceResolutionContext
): Promise<ResolvedPrice> {
  const variantId = context.variantId || context.productVariantId
  if (!variantId) {
    return {
      price: context.fallbackPrice ?? 0,
      minPrice: 0,
      costPrice: 0,
      maxDiscountPercent: 0,
      priceListId: null,
      priceListName: null,
      priceListType: null,
      source: 'fallback',
    }
  }

  let query = supabase
    .from('price_list_items')
    .select(`
      id,
      price_list_id,
      product_variant_id,
      product_id,
      price,
      cost_price,
      min_price,
      max_discount_percent,
      price_list:price_list (
        id,
        name,
        code,
        type,
        is_default,
        is_active,
        store_id,
        channel_id,
        group_id,
        currency_id,
        start_date,
        end_date
      )
    `)
    .eq('product_variant_id', variantId)

  if (context.tenantId) {
    query = query.eq('tenant_id', context.tenantId)
  }

  const { data, error } = await query

  if (error || !data || data.length === 0) {
    return {
      price: context.fallbackPrice ?? 0,
      minPrice: 0,
      costPrice: 0,
      maxDiscountPercent: 0,
      priceListId: null,
      priceListName: null,
      priceListType: null,
      source: 'fallback',
    }
  }

  const normalized = (data as unknown as Record<string, unknown>[]).map((item) => ({
    ...item,
    price_list: Array.isArray(item.price_list) ? item.price_list[0] : item.price_list,
  })) as PriceListItemWithList[]

  const resolved = resolvePriceFromListItems(normalized, context)
  if (resolved.source === 'fallback' && resolved.price === 0 && context.fallbackPrice) {
    resolved.price = context.fallbackPrice
  }
  return resolved
}
