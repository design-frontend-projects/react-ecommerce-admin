import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthEnabled } from '@/hooks/use-auth-query'

export interface CategoryOption {
  id: string
  name: string
}

export interface BrandOption {
  id: string
  name: string
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
        .select('id, name')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      return (data ?? []) as CategoryOption[]
    },
    enabled: authEnabled,
  })
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
        .select('id, name, code')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      return (data ?? []) as BrandOption[]
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
