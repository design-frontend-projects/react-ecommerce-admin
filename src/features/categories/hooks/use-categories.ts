import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthQuery } from '@/hooks/use-auth-query'
import { useAuthMutation } from '@/hooks/use-auth-mutation'
import {
  createCategory,
  deleteCategory,
  fetchCategories,
  updateCategory,
} from '../data/actions'
import type { Category, CategoryInput, CategoryListItem } from '../data/schema'

export type { Category, CategoryInput, CategoryListItem }

export const categoriesKey = ['inventory', 'categories'] as const

export function useCategories() {
  return useAuthQuery({
    queryKey: categoriesKey,
    queryFn: (getToken) => fetchCategories(getToken),
    rbac: { permission: 'products.view' },
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()
  return useAuthMutation({
    mutationFn: (getToken, input: CategoryInput) =>
      createCategory(getToken, input),
    rbac: { permission: 'products.manage' },
    onSuccess: () => {
      toast.success('Category created.')
      void queryClient.invalidateQueries({ queryKey: categoriesKey })
      void queryClient.invalidateQueries({ queryKey: ['categories', 'options'] })
    },
    onError: (error: Error) =>
      toast.error('Unable to create category', { description: error.message }),
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()
  return useAuthMutation({
    mutationFn: (
      getToken,
      { id, input }: { id: string; input: Partial<CategoryInput> }
    ) => updateCategory(getToken, id, input),
    rbac: { permission: 'products.manage' },
    onSuccess: () => {
      toast.success('Category updated.')
      void queryClient.invalidateQueries({ queryKey: categoriesKey })
      void queryClient.invalidateQueries({ queryKey: ['categories', 'options'] })
    },
    onError: (error: Error) =>
      toast.error('Unable to update category', { description: error.message }),
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()
  return useAuthMutation({
    mutationFn: (getToken, id: string) => deleteCategory(getToken, id),
    rbac: { permission: 'products.manage' },
    onSuccess: () => {
      toast.success('Category deleted.')
      void queryClient.invalidateQueries({ queryKey: categoriesKey })
      void queryClient.invalidateQueries({ queryKey: ['categories', 'options'] })
    },
    onError: (error: Error) =>
      toast.error('Unable to delete category', { description: error.message }),
  })
}
