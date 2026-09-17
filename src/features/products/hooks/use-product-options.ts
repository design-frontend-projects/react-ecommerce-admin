import { useMemo } from 'react'
import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthEnabled } from '@/hooks/use-auth-query'
import type { SearchableOption } from '@/components/custom-ui/virtual-searchable-select'

export interface CategoryOption {
  id: string
  name: string
  name_ar?: string | null
  parent_id?: string | null
}

export interface BrandOption {
  id: string
  name: string
  name_ar?: string | null
  code?: string | null
}

export interface UomOption {
  id: string
  name: string
  code: string
  uom_category?: string
}

export interface SupplierOption {
  id: string
  name: string
  code?: string | null
}

export interface ProductTypeOption {
  id: string
  name: string
  name_ar?: string | null
  code: string
  description?: string | null
  icon?: string | null
  color?: string | null
}

/**
 * Hook to fetch active categories for product form dropdowns.
 */
export function useCategoryOptions() {
  const { authEnabled } = useAuthEnabled({ permission: 'products.view' })
  return useQuery<CategoryOption[]>({
    queryKey: ['categories', 'options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, name_ar, parent_id')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      return (data ?? []) as CategoryOption[]
    },
    enabled: authEnabled,
  })
}

/**
 * Format category options into SearchableOption with parent path/description and Arabic names.
 */
export function formatCategorySearchableOptions(
  categories: CategoryOption[]
): SearchableOption[] {
  const map = new Map<string, CategoryOption>()
  categories.forEach((c) => map.set(c.id, c))

  return categories.map((cat) => {
    let description: string | undefined = undefined
    if (cat.parent_id && map.has(cat.parent_id)) {
      const parent = map.get(cat.parent_id)!
      const parentAr = parent.name_ar ? ` (${parent.name_ar})` : ''
      description = `${parent.name}${parentAr} › ${cat.name}`
    }

    return {
      id: cat.id,
      name: cat.name,
      name_ar: cat.name_ar,
      description,
    }
  })
}

/**
 * Hook that returns category options formatted for SearchableSelect comboboxes.
 */
export function useCategorySearchOptions() {
  const query = useCategoryOptions()
  const options = useMemo(
    () => formatCategorySearchableOptions(query.data ?? []),
    [query.data]
  )
  return { ...query, options }
}

export function formatBrandSearchableOptions(
  brands: BrandOption[]
): SearchableOption[] {
  return brands.map((b) => ({
    id: b.id,
    name: b.name,
    name_ar: b.name_ar,
    code: b.code,
  }))
}

/**
 * Hook to fetch active brands for product form dropdowns.
 */
export function useBrandOptions() {
  const { authEnabled } = useAuthEnabled({ permission: 'products.view' })
  return useQuery<BrandOption[]>({
    queryKey: ['brands', 'options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brands')
        .select('id, name, name_ar, code')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      return (data ?? []) as BrandOption[]
    },
    enabled: authEnabled,
  })
}

/**
 * Hook that returns brand options formatted for SearchableSelect comboboxes.
 */
export function useBrandSearchOptions() {
  const query = useBrandOptions()
  const options = useMemo(
    () => formatBrandSearchableOptions(query.data ?? []),
    [query.data]
  )
  return { ...query, options }
}

/**
 * Infinite query to fetch categories with pagination and optional search filter.
 */
export function useInfiniteCategoryOptions({
  search = '',
  pageSize = 30,
}: { search?: string; pageSize?: number } = {}) {
  const { authEnabled } = useAuthEnabled({ permission: 'products.view' })
  return useInfiniteQuery<CategoryOption[]>({
    queryKey: ['categories', 'options', 'infinite', search],
    queryFn: async ({ pageParam = 0 }) => {
      const from = (pageParam as number) * pageSize
      const to = from + pageSize - 1
      let query = supabase
        .from('categories')
        .select('id, name, name_ar, parent_id')
        .eq('is_active', true)
        .order('name')
        .range(from, to)

      if (search && search.trim()) {
        const term = search.trim()
        query = query.or(`name.ilike.%${term}%,name_ar.ilike.%${term}%`)
      }

      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as CategoryOption[]
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < pageSize) return undefined
      return allPages.length
    },
    enabled: authEnabled,
  })
}

/**
 * Infinite query to fetch brands with pagination and optional search filter.
 */
export function useInfiniteBrandOptions({
  search = '',
  pageSize = 30,
}: { search?: string; pageSize?: number } = {}) {
  const { authEnabled } = useAuthEnabled({ permission: 'products.view' })
  return useInfiniteQuery<BrandOption[]>({
    queryKey: ['brands', 'options', 'infinite', search],
    queryFn: async ({ pageParam = 0 }) => {
      const from = (pageParam as number) * pageSize
      const to = from + pageSize - 1
      let query = supabase
        .from('brands')
        .select('id, name, name_ar, code')
        .eq('is_active', true)
        .order('name')
        .range(from, to)

      if (search && search.trim()) {
        const term = search.trim()
        query = query.or(
          `name.ilike.%${term}%,name_ar.ilike.%${term}%,code.ilike.%${term}%`
        )
      }

      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as BrandOption[]
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < pageSize) return undefined
      return allPages.length
    },
    enabled: authEnabled,
  })
}


/**
 * Hook to fetch active units of measure (UOMs) for product dropdowns.
 */
export function useUomOptions() {
  const { authEnabled } = useAuthEnabled({ permission: 'products.view' })
  return useQuery<UomOption[]>({
    queryKey: ['uoms', 'options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('uoms')
        .select('id, name, code, uom_category')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      return (data ?? []) as UomOption[]
    },
    enabled: authEnabled,
  })
}

/**
 * Hook to fetch active suppliers for product dropdowns.
 */
export function useSupplierOptions() {
  const { authEnabled } = useAuthEnabled({ permission: 'products.view' })
  return useQuery<SupplierOption[]>({
    queryKey: ['suppliers', 'options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name, code')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      return (data ?? []) as SupplierOption[]
    },
    enabled: authEnabled,
  })
}

/**
 * Hook to fetch active product types (macro classifications: durable, non-durable, service, etc.)
 */
export function useProductTypeOptions() {
  const { authEnabled } = useAuthEnabled({ permission: 'products.view' })
  return useQuery<ProductTypeOption[]>({
    queryKey: ['product_types', 'options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_types')
        .select('id, name, name_ar, code, description, icon, color')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (error) throw error
      return (data ?? []) as ProductTypeOption[]
    },
    enabled: authEnabled,
  })
}

