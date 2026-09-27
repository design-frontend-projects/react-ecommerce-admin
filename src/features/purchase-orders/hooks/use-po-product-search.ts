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
        // eslint-disable-next-line no-console
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
    // eslint-disable-next-line no-console
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
      `id, sku, name, dimensions,
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
    // eslint-disable-next-line no-console
    console.error('Error fetching PO variants for product:', productId, error)
    throw error
  }

  return (data || []).map((variant) => {
    let attrLabel: string | undefined = undefined
    if (variant.dimensions) {
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
        : null
    const resolvedPrice =
      pli && pli.length > 0 && pli[0].price != null
        ? Number(pli[0].price)
        : 0

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

// ─── 4. Direct Variant Autocomplete Search ─────────────────────────
export interface POVariantSearchItem {
  id: string
  product_id: string
  sku: string
  barcode?: string | null
  name?: string | null
  product_name: string
  brand_name?: string | null
  category_name?: string | null
  uom_id?: string | null
  price: number
  cost_price: number | null
  stock_quantity?: number
}

interface SupabaseVariantRow {
  id: string
  product_id?: string | null
  sku: string
  barcode?: string | null
  name?: string | null
  uom_id?: string | null
  products?: {
    id: string
    name: string
    sku?: string | null
    barcode?: string | null
    base_uom_id?: string | null
    categories?: { name?: string | null } | null
    brands?: { name?: string | null } | null
  } | null
  price_list_items?: Array<{ price?: number | string | null; cost_price?: number | string | null }> | null
  stock_balances?: Array<{ qty_available?: number | string | null; qty_on_hand?: number | string | null; qty_reserved?: number | string | null }> | null
}

export async function fetchPOVariantSearch(
  search: string,
  limit = 25
): Promise<POVariantSearchItem[]> {
  const trimmed = search.trim()
  const { tenantId } = getAuthTenantAndUser()

  // 1. Try server API route first
  try {
    const { session } = (await supabase.auth.getSession()).data
    const token = session?.access_token

    const params = new URLSearchParams()
    if (trimmed) params.set('search', trimmed)
    params.set('limit', String(limit))
    params.set('pageSize', String(limit))

    const headers: Record<string, string> = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const res = await fetch(`/api/inventory/product-variants?${params.toString()}`, {
      headers,
    })
    if (res.ok) {
      const data = await res.json()
      const rawList = data?.items || data?.data || []
      if (Array.isArray(rawList)) {
        return (rawList as Array<Record<string, unknown>>).map((item) => {
          const prods = item.products as Record<string, unknown> | undefined
          const brands = prods?.brands as Record<string, unknown> | undefined
          const categories = prods?.categories as Record<string, unknown> | undefined

          return {
            id: String(item.id),
            product_id: String(item.product_id ?? prods?.id ?? ''),
            sku: String(item.sku ?? ''),
            barcode: (item.barcode as string) ?? null,
            name: (item.name as string) ?? null,
            product_name: String(item.product_name ?? prods?.name ?? 'Unknown Product'),
            brand_name: (item.brand_name as string) ?? (brands?.name as string) ?? null,
            category_name: (item.category_name as string) ?? (categories?.name as string) ?? null,
            uom_id: (item.uom_id as string) ?? (prods?.base_uom_id as string) ?? null,
            price: Number(item.price ?? 0),
            cost_price: item.cost_price != null ? Number(item.cost_price) : null,
            stock_quantity: item.qty_available != null ? Number(item.qty_available) : Number(item.stock_quantity ?? 0),
          }
        })
      }
    }
  } catch (_err) {
    // API route fallback to Supabase
  }

  // 2. Tenant-scoped Supabase query fallback
  let query = supabase
    .from('product_variants')
    .select(`
      id, sku, barcode, name, dimensions, is_active, uom_id, product_id,
      products (
        id, name, sku, barcode, base_uom_id,
        categories ( name ),
        brands ( name )
      ),
      price_list_items ( price, cost_price ),
      stock_balances ( qty_available, qty_on_hand, qty_reserved )
    `)
    .neq('is_active', false)
    .limit(limit)

  if (tenantId && isValidUuid(tenantId)) {
    query = query.eq('tenant_id', tenantId)
  }

  if (trimmed) {
    const sanitized = trimmed.replace(/[%_,()]/g, '')
    if (sanitized) {
      query = query.or(
        `sku.ilike.%${sanitized}%,barcode.ilike.%${sanitized}%,name.ilike.%${sanitized}%`
      )
    }
  }

  const { data, error } = await query

  if (error) {
    // eslint-disable-next-line no-console
    console.error('Error searching PO variants:', error)
    return []
  }

  return ((data || []) as unknown as SupabaseVariantRow[]).map((v) => {
    const pli = v.price_list_items?.[0]
    const resolvedCost =
      pli?.cost_price != null
        ? Number(pli.cost_price)
        : null
    const resolvedPrice = pli?.price != null ? Number(pli.price) : 0

    const balances = v.stock_balances || []
    const resolvedStock = balances.length > 0
      ? balances.reduce(
          (sum: number, b) =>
            sum + Number(b.qty_available ?? Number(b.qty_on_hand || 0) - Number(b.qty_reserved || 0)),
          0
        )
      : undefined

    return {
      id: String(v.id),
      product_id: String(v.product_id ?? v.products?.id ?? ''),
      sku: v.sku,
      barcode: v.barcode ?? null,
      name: v.name ?? null,
      product_name: v.products?.name ?? 'Unknown Product',
      brand_name: v.products?.brands?.name ?? null,
      category_name: v.products?.categories?.name ?? null,
      uom_id: v.uom_id || v.products?.base_uom_id || null,
      price: resolvedPrice,
      cost_price: resolvedCost,
      stock_quantity: resolvedStock,
    }
  })
}

export function usePOVariantSearch(
  search: string,
  limit = 25,
  options?: { enabled?: boolean }
) {
  const { authEnabled } = useAuthEnabled({ permission: 'products.view' })
  const debouncedSearch = useDebounce(search, 300)

  return useQuery({
    queryKey: ['po-variant-autocomplete-search', debouncedSearch, limit],
    queryFn: () => fetchPOVariantSearch(debouncedSearch, limit),
    enabled: authEnabled && (options?.enabled ?? true),
    staleTime: 30 * 1000,
  })
}

export async function fetchSinglePOVariant(
  variantId: string
): Promise<POVariantSearchItem | null> {
  if (!variantId || variantId === '0') return null
  const { tenantId } = getAuthTenantAndUser()

  let query = supabase
    .from('product_variants')
    .select(`
      id, sku, barcode, name, dimensions, is_active, uom_id, product_id,
      products (
        id, name, sku, barcode, base_uom_id,
        categories ( name ),
        brands ( name )
      ),
      price_list_items ( price, cost_price )
    `)
    .eq('id', variantId)

  if (tenantId && isValidUuid(tenantId)) {
    query = query.eq('tenant_id', tenantId)
  }

  const { data, error } = await query.maybeSingle()
  if (error || !data) return null

  const v = data as unknown as SupabaseVariantRow
  const pli = v.price_list_items?.[0]
  return {
    id: String(v.id),
    product_id: String(v.product_id ?? v.products?.id ?? ''),
    sku: v.sku,
    barcode: v.barcode ?? null,
    name: v.name ?? null,
    product_name: v.products?.name ?? 'Unknown Product',
    brand_name: v.products?.brands?.name ?? null,
    category_name: v.products?.categories?.name ?? null,
    uom_id: v.uom_id || v.products?.base_uom_id || null,
    price: pli?.price != null ? Number(pli.price) : 0,
    cost_price: pli?.cost_price != null ? Number(pli.cost_price) : null,
    stock_quantity: undefined,
  }
}

export function useSinglePOVariant(variantId: string | null | undefined) {
  const { authEnabled } = useAuthEnabled({ permission: 'products.view' })
  const cleanId = variantId ? String(variantId) : ''

  return useQuery({
    queryKey: ['po-single-variant', cleanId],
    queryFn: () => fetchSinglePOVariant(cleanId),
    enabled: Boolean(cleanId && cleanId !== '0') && authEnabled,
    staleTime: 5 * 60 * 1000,
  })
}

