import { useMemo, useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthEnabled } from '@/hooks/use-auth-query'

export interface ChannelPriceListItem {
  id: string
  price_list_id: string
  product_id?: string | null
  product_variant_id: string
  price: number | string
  cost_price?: number | string | null
  min_price?: number | string | null
  max_discount_percent?: number | string | null
}

export interface ChannelPriceListAssignment {
  id: string
  price_list_id: string
  store_id?: string | null
  channel_id?: string | null
  customer_group_id?: string | null
  assignment_type?: string | null
  priority?: number | null
  is_default?: boolean | null
  is_active?: boolean | null
  valid_from?: string | null
  valid_to?: string | null
  deleted_at?: string | null
}

export interface ChannelPriceListRecord {
  id: string
  name: string
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
  price_list_items?: ChannelPriceListItem[]
  price_list_assignments?: ChannelPriceListAssignment[]
}

export interface ResolvedVariantPriceInfo {
  price: number
  costPrice?: number | null
  minPrice?: number | null
  maxDiscountPercent?: number | null
  priceListId: string
  priceListName: string
  source: 'channel' | 'customer_group' | 'store' | 'default' | 'fallback'
  priority?: number | null
}

export interface ScoredPriceList {
  priceList: ChannelPriceListRecord
  score: number
  priority: number
  isChannelSpecific: boolean
  isStoreSpecific: boolean
  isCustomerGroupSpecific: boolean
  source: ResolvedVariantPriceInfo['source']
}

/**
 * Pure helper to evaluate how relevant a price list is to a given channel & store context.
 */
export function scorePriceListForContext(
  pl: ChannelPriceListRecord,
  context: {
    channelId?: string | null
    storeId?: string | null
    customerGroupId?: string | null
  }
): ScoredPriceList {
  const { channelId, storeId, customerGroupId } = context
  let bestScore = 0
  let bestPriority = 100
  let isChannelSpecific = false
  let isStoreSpecific = false
  let isCustomerGroupSpecific = false
  let source: ResolvedVariantPriceInfo['source'] = 'fallback'

  // Direct channel match on price_list header
  if (channelId && pl.channel_id === channelId) {
    bestScore = Math.max(bestScore, 1200)
    isChannelSpecific = true
    source = 'channel'
  }

  // Direct store match on price_list header
  if (storeId && pl.store_id === storeId) {
    bestScore = Math.max(bestScore, 1000)
    isStoreSpecific = true
    if (source === 'fallback') source = 'store'
  }

  // Direct group match on price_list header
  if (customerGroupId && pl.group_id === customerGroupId) {
    bestScore = Math.max(bestScore, 1500)
    isCustomerGroupSpecific = true
    source = 'customer_group'
  }

  // Evaluate price_list_assignments
  const assignments = (pl.price_list_assignments || []).filter(
    (a) => a.is_active !== false && !a.deleted_at
  )

  for (const a of assignments) {
    const priority = a.priority ?? 100
    const matchChannel = Boolean(channelId && a.channel_id === channelId)
    const matchStore = Boolean(storeId && a.store_id === storeId)
    const matchGroup = Boolean(
      customerGroupId && a.customer_group_id === customerGroupId
    )

    let score = 0
    if (matchStore && matchChannel && matchGroup) {
      score = 4000
      isChannelSpecific = true
      isStoreSpecific = true
      isCustomerGroupSpecific = true
      source = 'channel'
    } else if (matchChannel && matchGroup) {
      score = 2500
      isChannelSpecific = true
      isCustomerGroupSpecific = true
      source = 'channel'
    } else if (matchStore && matchChannel) {
      score = 2000
      isChannelSpecific = true
      isStoreSpecific = true
      source = 'channel'
    } else if (matchGroup) {
      score = 1500
      isCustomerGroupSpecific = true
      source = 'customer_group'
    } else if (matchChannel) {
      score = 1200
      isChannelSpecific = true
      source = 'channel'
    } else if (matchStore) {
      score = 1000
      isStoreSpecific = true
      if (source !== 'channel') source = 'store'
    } else if (a.is_default) {
      score = 100
      if (source === 'fallback') source = 'default'
    }

    if (score > bestScore || (score === bestScore && priority < bestPriority)) {
      bestScore = score
      bestPriority = priority
    }
  }

  if (bestScore === 0 && pl.is_default) {
    bestScore = 100
    source = 'default'
  }

  return {
    priceList: pl,
    score: bestScore,
    priority: bestPriority,
    isChannelSpecific,
    isStoreSpecific,
    isCustomerGroupSpecific,
    source,
  }
}

/**
 * Builds a fast Map of variantId -> ResolvedVariantPriceInfo from price lists,
 * prioritizing the active price list, with fallback to store/default price lists.
 */
export function buildVariantPriceMap(
  activePriceList: ChannelPriceListRecord | null,
  fallbackPriceLists: ChannelPriceListRecord[] = []
): Map<string, ResolvedVariantPriceInfo> {
  const map = new Map<string, ResolvedVariantPriceInfo>()

  // 1. First seed fallbacks (e.g., store or default price lists)
  for (const pl of fallbackPriceLists) {
    if (!pl || pl.id === activePriceList?.id) continue
    for (const item of pl.price_list_items || []) {
      if (!item.product_variant_id) continue
      const vId = String(item.product_variant_id)
      if (!map.has(vId)) {
        map.set(vId, {
          price: Number(item.price || 0),
          costPrice: item.cost_price != null ? Number(item.cost_price) : null,
          minPrice: item.min_price != null ? Number(item.min_price) : null,
          maxDiscountPercent:
            item.max_discount_percent != null
              ? Number(item.max_discount_percent)
              : null,
          priceListId: pl.id,
          priceListName: pl.name || pl.code || 'Default Price List',
          source: pl.is_default ? 'default' : 'store',
        })
      }
    }
  }

  // 2. Overlay the active / selected price list (highest precedence)
  if (activePriceList) {
    for (const item of activePriceList.price_list_items || []) {
      if (!item.product_variant_id) continue
      const vId = String(item.product_variant_id)
      map.set(vId, {
        price: Number(item.price || 0),
        costPrice: item.cost_price != null ? Number(item.cost_price) : null,
        minPrice: item.min_price != null ? Number(item.min_price) : null,
        maxDiscountPercent:
          item.max_discount_percent != null
            ? Number(item.max_discount_percent)
            : null,
        priceListId: activePriceList.id,
        priceListName: activePriceList.name || activePriceList.code || 'Channel Price List',
        source: activePriceList.channel_id ? 'channel' : 'store',
      })
    }
  }

  return map
}

export interface UseChannelPriceListsParams {
  channelId?: string | null
  storeId?: string | null
  customerGroupId?: string | null
  currencyId?: string | null
  enabled?: boolean
}

export function useChannelPriceLists({
  channelId,
  storeId,
  customerGroupId,
  currencyId,
  enabled = true,
}: UseChannelPriceListsParams) {
  const { authEnabled } = useAuthEnabled({ permission: 'sales.view' })
  const [selectedPriceListId, setSelectedPriceListId] = useState<string | null>(
    null
  )

  // Fetch all active price lists with items and assignments
  const {
    data: allPriceLists = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<ChannelPriceListRecord[]>({
    queryKey: ['price_lists', 'channel_resolution', currencyId],
    queryFn: async () => {
      let query = supabase
        .from('price_list')
        .select(
          `
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
          end_date,
          price_list_items (
            id,
            price_list_id,
            product_id,
            product_variant_id,
            price,
            cost_price,
            min_price,
            max_discount_percent
          ),
          price_list_assignments (
            id,
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
            deleted_at
          )
        `
        )
        .eq('is_active', true)

      if (currencyId) {
        query = query.or(`currency_id.eq.${currencyId},currency_id.is.null`)
      }

      const { data, error } = await query.order('name')
      if (error) throw error
      return (data ?? []) as ChannelPriceListRecord[]
    },
    enabled: enabled && authEnabled,
  })

  // Score and categorize price lists for the active channel, store & customer group
  const {
    channelRelatedPriceLists,
    storeFallbackPriceLists,
    allScoredPriceLists,
    bestMatchedPriceList,
  } = useMemo(() => {
    const scored = allPriceLists.map((pl) =>
      scorePriceListForContext(pl, { channelId, storeId, customerGroupId })
    )

    // Sort: highest score first, then lowest priority number (1 beats 100), then name
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      if (a.priority !== b.priority) return a.priority - b.priority
      return a.priceList.name.localeCompare(b.priceList.name)
    })

    // Specifically filter price lists that belong to or contain this channel
    const channelMatches = scored.filter(
      (s) => channelId && (s.isChannelSpecific || s.priceList.channel_id === channelId)
    )

    // Fallbacks (store-specific or default)
    const fallbacks = scored.filter(
      (s) => !s.isChannelSpecific && (s.isStoreSpecific || s.priceList.is_default)
    )

    const best = channelMatches.length > 0 ? channelMatches[0] : scored[0]

    return {
      channelRelatedPriceLists: channelMatches.map((s) => s.priceList),
      storeFallbackPriceLists: fallbacks.map((s) => s.priceList),
      allScoredPriceLists: scored,
      bestMatchedPriceList: best?.priceList ?? null,
    }
  }, [allPriceLists, channelId, storeId, customerGroupId])

  // Automatically sync or reset selectedPriceListId when channel or best match changes
  useEffect(() => {
    if (bestMatchedPriceList) {
      setSelectedPriceListId(bestMatchedPriceList.id)
    } else {
      setSelectedPriceListId(null)
    }
  }, [channelId, bestMatchedPriceList?.id])

  // Determine active price list
  const activePriceList = useMemo(() => {
    if (selectedPriceListId) {
      const found = allPriceLists.find((pl) => pl.id === selectedPriceListId)
      if (found) return found
    }
    return bestMatchedPriceList
  }, [selectedPriceListId, allPriceLists, bestMatchedPriceList])

  // Precomputed fast variant pricing map
  const variantPriceMap = useMemo(() => {
    return buildVariantPriceMap(
      activePriceList,
      storeFallbackPriceLists.length > 0
        ? storeFallbackPriceLists
        : allPriceLists
    )
  }, [activePriceList, storeFallbackPriceLists, allPriceLists])

  return {
    allPriceLists,
    channelRelatedPriceLists,
    storeFallbackPriceLists,
    allScoredPriceLists,
    bestMatchedPriceList,
    activePriceList,
    selectedPriceListId,
    setSelectedPriceListId,
    variantPriceMap,
    isLoading,
    isRefetching,
    refetch,
    hasChannelSpecificPriceList: channelRelatedPriceLists.length > 0,
  }
}
