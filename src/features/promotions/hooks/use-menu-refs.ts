// Lightweight lookups of restaurant menu items/categories for the promotion
// scope pickers (item-level discounts and buy-x-get-y sets).
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface MenuItemRef {
  id: string
  name: string
}

export interface MenuCategoryRef {
  id: string
  name: string
}

export const useMenuItemRefs = () => {
  return useQuery({
    queryKey: ['promotions', 'menu-item-refs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('res_menu_items')
        .select('id, name')
        .order('name')

      if (error) throw error
      return (data ?? []) as MenuItemRef[]
    },
    staleTime: 5 * 60_000,
  })
}

export const useMenuCategoryRefs = () => {
  return useQuery({
    queryKey: ['promotions', 'menu-category-refs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('res_menu_categories')
        .select('id, name')
        .order('name')

      if (error) throw error
      return (data ?? []) as MenuCategoryRef[]
    },
    staleTime: 5 * 60_000,
  })
}
