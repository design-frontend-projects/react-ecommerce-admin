import { useState, useEffect, useMemo } from 'react'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthEnabled } from '@/hooks/use-auth-query'
import { getAuthTenantAndUser, isValidUuid } from '@/lib/client-tenant'

// ─── Types ──────────────────────────────────────────────────
export interface POProductOption {
  id: string
  name: string
  sku?: string | null
  base_uom_id?: string | null
  has_expiration?: boolean | null
  categories?: {
    id: string
    name: string
    name_ar?: string | null
  } | null
  base_uom?: {
    id: string
    name: string
    code?: string
  } | null
  product_variants?: Array<{
    id: string
  }> | null
}

export interface VariantOption {
  id: string
  sku: string
  name?: string | null
  attributes_label?: string
  price: number
  cost_price: number | null
  stock_quantity?: number
}

interface ProductPage {
  items: POProductOption[]
  nextPage: number | undefined
  totalCount: number
}

// ─── Debounce Hook ──────────────────────────────────────────
export function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

// ─── 1. Server-Side Infinite Product Search Hook ────────────
export function usePOProductSearch(
  search: string,
  pageSize = 25,
  options?: { enabled?: boolean }
) {
  const { authEnabled } = useAuthEnabled({ permission: 'products.view' })
  const trimmed = search.trim()

  const query = useInfiniteQuery<ProductPage>({
    queryKey: ['po-products-search', trimmed, pageSize],
    queryFn: async ({ pageParam = 0 }) => {
      const { tenantId } = getAuthTenantAndUser()
      const currentPage = typeof pageParam === 'number' ? pageParam : 0
      const from = currentPage * pageSize
      const to = from + pageSize - 1

      let dbQuery = supabase
        .from('products')
        .select(
          `id, name, sku, base_uom_id, has_expiration,
           categories(id, name, name_ar),
           base_uom:uoms(id, name, code),
           product_variants(id)`,
          { count: 'exact' }
        )
        .neq('is_deleted', true)

      if (tenantId && isValidUuid(tenantId)) {
        dbQuery = dbQuery.eq('tenant_id', tenantId)
      }

      if (trimmed) {
        // PostgREST ilike pattern with special character escape
        const sanitized = trimmed.replace(/[%_,()]/g, '')
        if (sanitized) {
          dbQuery = dbQuery.or(
            `name.ilike.%${sanitized}%,sku.ilike.%${sanitized}%`
          )
        }
      }

      dbQuery = dbQuery.order('name', { ascending: true }).range(from, to)

      const { data, count, error } = await dbQuery

      if (error) {
        console.error('Error searching PO products:', error)
        throw error
      }

      const rawItems = (data || []) as unknown as POProductOption[]
      const totalCount = count ?? 0
      const hasMore = rawItems.length === pageSize && from + rawItems.length < totalCount
      const nextPage = hasMore ? currentPage + 1 : undefined

      return {
        items: rawItems,
        nextPage,
        totalCount,
      }
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
    enabled: authEnabled && (options?.enabled ?? true),
    staleTime: 60 * 1000,
  })

  const products = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data]
  )

  const totalCount = query.data?.pages[0]?.totalCount ?? 0

  return {
    ...query,
    products,
    totalCount,
  }
}

// ─── 2. Fetch Single Product (for cached / direct lookup) ───
export async function fetchPOProduct(
  productId: string
): Promise<POProductOption | null> {
  if (!productId || productId === '0') return null
  const { tenantId } = getAuthTenantAndUser()

  let dbQuery = supabase
    .from('products')
    .select(
      `id, name, sku, base_uom_id, has_expiration,
       categories(id, name, name_ar),
       base_uom:uoms(id, name, code),
       product_variants(id)`
    )
    .eq('id', productId)

  if (tenantId && isValidUuid(tenantId)) {
    dbQuery = dbQuery.eq('tenant_id', tenantId)
  }

  const { data, error } = await dbQuery.maybeSingle()

  if (error) {
    console.error('Error fetching single PO product:', error)
    return null
  }

  return (data as unknown as POProductOption) || null
}

export function usePOProduct(
  productId?: string | number | null,
  options?: { enabled?: boolean }
) {
  const { authEnabled } = useAuthEnabled({ permission: 'products.view' })
  const cleanId = productId ? String(productId) : ''

  return useQuery({
    queryKey: ['po-product', cleanId],
    queryFn: () => fetchPOProduct(cleanId),
    enabled:
      Boolean(cleanId && cleanId !== '0') &&
      authEnabled &&
      (options?.enabled ?? true),
    staleTime: 5 * 60 * 1000,
  })
}

// ─── 3. Fetch Variants on-demand for a single product ────────
export async function fetchPOVariants(
  productId: string
): Promise<VariantOption[]> {
  if (!productId || productId === '0') return []
  const { tenantId } = getAuthTenantAndUser()

  let dbQuery = supabase
    .from('product_variants')
    .select(
      `id, sku, name, attributes_label, dimensions, cost_price, price, stock_quantity,
       price_list_items(price, cost_price),
       stock_balances(qty_available, qty_on_hand, qty_reserved)`
    )
    .eq('product_id', productId)
    .order('sku', { ascending: true })

  if (tenantId && isValidUuid(tenantId)) {
    dbQuery = dbQuery.eq('tenant_id', tenantId)
  }

  const { data, error } = await dbQuery

  if (error) {
    console.error('Error fetching PO variants for product:', productId, error)
    throw error
  }

  return (data || []).map((variant) => {
    let attrLabel = variant.attributes_label
    if (!attrLabel && variant.dimensions) {
      try {
        const parsed =
          typeof variant.dimensions === 'string'
            ? JSON.parse(variant.dimensions)
            : variant.dimensions
        attrLabel = parsed?.label || undefined
      } catch {
        attrLabel =
          typeof variant.dimensions === 'string'
            ? variant.dimensions
            : undefined
      }
    }

    const pli = (
      variant as {
        price_list_items?: Array<{
          price?: number | string
          cost_price?: number | string | null
        }>
      }
    ).price_list_items
    const resolvedCost =
      pli && pli.length > 0 && pli[0].cost_price != null
        ? Number(pli[0].cost_price)
        : variant.cost_price != null
          ? Number(variant.cost_price)
          : null
    const resolvedPrice =
      pli && pli.length > 0
        ? Number(pli[0].price)
        : Number(variant.price ?? 0)

    const balances = (
      variant as {
        stock_balances?: Array<{
          qty_available?: number | string
          qty_on_hand?: number | string
          qty_reserved?: number | string
        }>
      }
    ).stock_balances
    const resolvedStock =
      balances && balances.length > 0
        ? balances.reduce(
            (sum, b) =>
              sum +
              Number(
                b.qty_available ??
                  Number(b.qty_on_hand || 0) - Number(b.qty_reserved || 0)
              ),
            0
          )
        : variant.stock_quantity !== undefined
          ? Number(variant.stock_quantity)
          : undefined

    return {
      id: String(variant.id),
      sku: variant.sku,
      name: variant.name ?? null,
      attributes_label: attrLabel,
      price: resolvedPrice,
      cost_price: resolvedCost,
      stock_quantity: resolvedStock,
    }
  })
}

export function usePOVariants(
  productId?: string | number | null,
  options?: { enabled?: boolean }
) {
  const { authEnabled } = useAuthEnabled({ permission: 'products.view' })
  const cleanId = productId ? String(productId) : ''

  return useQuery({
    queryKey: ['po-variants', cleanId],
    queryFn: () => fetchPOVariants(cleanId),
    enabled:
      Boolean(cleanId && cleanId !== '0') &&
      authEnabled &&
      (options?.enabled ?? true),
    staleTime: 60 * 1000,
  })
}
