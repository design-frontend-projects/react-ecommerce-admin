import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface Category {
  category_id: number
  name: string
  description: string | null
  created_at: string
}

export interface CategoryInput {
  name: string
  description?: string
}

export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name')

      if (error) throw error
      return data as Category[]
    },
  })
}

export const useCategory = (id: number) => {
  return useQuery({
    queryKey: ['categories', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('category_id', id)
        .single()

      if (error) throw error
      return data as Category
    },
    enabled: !!id,
  })
}

export const useCreateCategory = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (newCategory: CategoryInput) => {
      const { data, error } = await supabase
        .from('categories')
        .insert(newCategory)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}

export const useUpdateCategory = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: CategoryInput & { id: number }) => {
      const { data, error } = await supabase
        .from('categories')
        .update(updates)
        .eq('category_id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}

export const useDeleteCategory = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('category_id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}
