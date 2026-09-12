import type { SupabaseClient } from '@supabase/supabase-js'

export interface PriceResolutionContext {
  tenantId?: string | null
  variantId: string
  productVariantId?: string // backward compatibility alias
  productId?: string | null
  storeId?: string | null
  channelId?: string | null
  salesChannelId?: string | null // alias for channelId
  customerGroupId?: string | null
  currencyId?: string | null
  date?: string | Date | null
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
  assignmentId?: string | null
  assignmentType?: string | null
  priority?: number | null
  source:
    | 'assignment_matrix'
    | 'customer_group'
    | 'channel'
    | 'store'
    | 'default'
    | 'fallback'
}

export interface PriceListAssignmentRecord {
  id: string
  tenant_id?: string
  price_list_id: string
  store_id?: string | null
  channel_id?: string | null
  customer_group_id?: string | null
  assignment_type?: string
  priority?: number
  is_default?: boolean
  is_active?: boolean
  valid_from?: string | null
  valid_to?: string | null
  deleted_at?: string | null
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
    price_list_assignments?: PriceListAssignmentRecord[] | null
  } | null
}

/**
 * Calculates a specificity score for an assignment matching the given context.
 * Higher score = more specific match.
 */
function calculateSpecificityScore(
  assignment: PriceListAssignmentRecord,
  context: PriceResolutionContext
): number {
  const effectiveChannelId = context.channelId || context.salesChannelId

  const matchStore = Boolean(context.storeId && assignment.store_id === context.storeId)
  const matchChannel = Boolean(effectiveChannelId && assignment.channel_id === effectiveChannelId)
  const matchGroup = Boolean(context.customerGroupId && assignment.customer_group_id === context.customerGroupId)

  // 3-way match: Store + Channel + Customer Group
  if (matchStore && matchChannel && matchGroup) return 4000

  // 2-way matches
  if (matchStore && matchGroup) return 3000
  if (matchChannel && matchGroup) return 2500
  if (matchStore && matchChannel) return 2000

  // 1-way matches
  if (matchGroup) return 1500
  if (matchChannel) return 1200
  if (matchStore) return 1000

  // Global scope (is_default or all scopes null)
  if (!assignment.store_id && !assignment.channel_id && !assignment.customer_group_id) {
    return 100
  }

  return 0
}

/**
 * Checks whether an assignment satisfies the current resolution context and validity constraints.
 */
function isAssignmentMatchingContext(
  assignment: PriceListAssignmentRecord,
  context: PriceResolutionContext,
  nowIsoDate: string
): boolean {
  if (assignment.is_active === false) return false
  if (assignment.deleted_at) return false

  // Date range check
  if (assignment.valid_from && assignment.valid_from.slice(0, 10) > nowIsoDate) return false
  if (assignment.valid_to && assignment.valid_to.slice(0, 10) < nowIsoDate) return false

  const effectiveChannelId = context.channelId || context.salesChannelId

  // Scope constraints:
  // If assignment has a store_id, context MUST match it
  if (assignment.store_id) {
    if (!context.storeId || assignment.store_id !== context.storeId) return false
  }

  // If assignment has a channel_id, context MUST match it
  if (assignment.channel_id) {
    if (!effectiveChannelId || assignment.channel_id !== effectiveChannelId) return false
  }

  // If assignment has a customer_group_id, context MUST match it
  if (assignment.customer_group_id) {
    if (!context.customerGroupId || assignment.customer_group_id !== context.customerGroupId) return false
  }

  return true
}

/**
 * Synchronously resolves the best price for a variant given an in-memory array of price list items
 * matching the context (via price_list_assignments or legacy fallback).
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

  const evalDate = context.date
    ? (typeof context.date === 'string' ? context.date.slice(0, 10) : context.date.toISOString().slice(0, 10))
    : new Date().toISOString().slice(0, 10) // YYYY-MM-DD

  // Filter items whose parent price_list is active, valid, and matches currency if requested
  const activeItems = items.filter((item) => {
    const pl = Array.isArray(item.price_list) ? item.price_list[0] : item.price_list
    if (!pl) return true
    if (pl.is_active === false) return false
    if (pl.start_date && pl.start_date.slice(0, 10) > evalDate) return false
    if (pl.end_date && pl.end_date.slice(0, 10) < evalDate) return false
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

  const effectiveChannelId = context.channelId || context.salesChannelId

  // --------------------------------------------------------------------------
  // Phase 1: Try resolving through price_list_assignments
  // --------------------------------------------------------------------------
  interface CandidateMatch {
    item: PriceListItemWithList
    assignment: PriceListAssignmentRecord
    score: number
    priority: number
  }

  const assignmentMatches: CandidateMatch[] = []

  for (const item of activeItems) {
    const pl = Array.isArray(item.price_list) ? item.price_list[0] : item.price_list
    const assignments = pl?.price_list_assignments
    if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
      continue
    }

    for (const assignment of assignments) {
      if (isAssignmentMatchingContext(assignment, context, evalDate)) {
        const score = calculateSpecificityScore(assignment, context)
        const priority = assignment.priority ?? 100
        assignmentMatches.push({
          item,
          assignment,
          score,
          priority,
        })
      }
    }
  }

  if (assignmentMatches.length > 0) {
    // Sort by:
    // 1. Specificity score DESC (more specific scope first)
    // 2. Priority ASC (lower number = higher priority: 10 beats 100)
    // 3. is_default DESC
    assignmentMatches.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      if (a.priority !== b.priority) return a.priority - b.priority
      const defA = a.assignment.is_default ? 1 : 0
      const defB = b.assignment.is_default ? 1 : 0
      return defB - defA
    })

    const best = assignmentMatches[0]
    const pl = Array.isArray(best.item.price_list) ? best.item.price_list[0] : best.item.price_list

    let sourceName: ResolvedPrice['source'] = 'assignment_matrix'
    if (best.assignment.customer_group_id && !best.assignment.store_id && !best.assignment.channel_id) {
      sourceName = 'customer_group'
    } else if (best.assignment.channel_id && !best.assignment.store_id && !best.assignment.customer_group_id) {
      sourceName = 'channel'
    } else if (best.assignment.store_id && !best.assignment.channel_id && !best.assignment.customer_group_id) {
      sourceName = 'store'
    } else if (best.assignment.is_default && !best.assignment.store_id && !best.assignment.channel_id && !best.assignment.customer_group_id) {
      sourceName = 'default'
    }

    return {
      price: Number(best.item.price || 0),
      minPrice: Number(best.item.min_price || 0),
      costPrice: Number(best.item.cost_price || 0),
      maxDiscountPercent: Number(best.item.max_discount_percent || 0),
      priceListId: best.item.price_list_id,
      priceListName: pl?.name || pl?.code || null,
      priceListType: pl?.type || null,
      assignmentId: best.assignment.id,
      assignmentType: best.assignment.assignment_type || null,
      priority: best.priority,
      source: sourceName,
    }
  }

  // --------------------------------------------------------------------------
  // Phase 2: Legacy fallback resolution (for records before backfill or without assignments)
  // --------------------------------------------------------------------------
  const candidates = activeItems

  // Legacy Priority 1: Specific customer group match
  if (context.customerGroupId) {
    const groupMatch = candidates.find((i) => {
      const pl = Array.isArray(i.price_list) ? i.price_list[0] : i.price_list
      return pl?.group_id === context.customerGroupId
    })
    if (groupMatch) {
      return formatResolvedPrice(groupMatch, 'customer_group')
    }
  }

  // Legacy Priority 2: Specific sales channel match
  if (effectiveChannelId) {
    const channelMatch = candidates.find((i) => {
      const pl = Array.isArray(i.price_list) ? i.price_list[0] : i.price_list
      return pl?.channel_id === effectiveChannelId
    })
    if (channelMatch) {
      return formatResolvedPrice(channelMatch, 'channel')
    }
  }

  // Legacy Priority 3: Specific store match
  if (context.storeId) {
    const storeMatch = candidates.find((i) => {
      const pl = Array.isArray(i.price_list) ? i.price_list[0] : i.price_list
      return pl?.store_id === context.storeId
    })
    if (storeMatch) {
      return formatResolvedPrice(storeMatch, 'store')
    }
  }

  // Legacy Priority 4: Default price list
  const defaultMatch = candidates.find((i) => {
    const pl = Array.isArray(i.price_list) ? i.price_list[0] : i.price_list
    return pl?.is_default === true
  })
  if (defaultMatch) {
    return formatResolvedPrice(defaultMatch, 'default')
  }

  // Legacy Priority 5: Any first candidate
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
        end_date,
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
          deleted_at
        )
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

  const normalized = (data as unknown as Record<string, unknown>[]).map((item) => {
    const pl = Array.isArray(item.price_list) ? item.price_list[0] : item.price_list
    return {
      ...item,
      price_list: pl,
    }
  }) as PriceListItemWithList[]

  const resolved = resolvePriceFromListItems(normalized, context)
  if (resolved.source === 'fallback' && resolved.price === 0 && context.fallbackPrice) {
    resolved.price = context.fallbackPrice
  }
  return resolved
}

