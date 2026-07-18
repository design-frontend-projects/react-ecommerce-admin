import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthQuery } from '@/hooks/use-auth-query'
import { useAuthMutation } from '@/hooks/use-auth-mutation'
import {
  createBrand,
  deleteBrand,
  fetchBrands,
  updateBrand,
} from '../data/actions'
import type { BrandInput } from '../data/schema'

const brandsKey = ['inventory', 'brands'] as const

export function useBrands() {
  return useAuthQuery({
    queryKey: brandsKey,
    queryFn: (getToken) => fetchBrands(getToken),
    rbac: { permission: 'products.view' },
  })
}

export function useCreateBrand() {
  const queryClient = useQueryClient()
  return useAuthMutation({
    mutationFn: (getToken, input: BrandInput) => createBrand(getToken, input),
    rbac: { permission: 'products.manage' },
    onSuccess: () => {
      toast.success('Brand created.')
      void queryClient.invalidateQueries({ queryKey: brandsKey })
    },
    onError: (error: Error) =>
      toast.error('Unable to create brand', { description: error.message }),
  })
}

export function useUpdateBrand() {
  const queryClient = useQueryClient()
  return useAuthMutation({
    mutationFn: (getToken, { id, input }: { id: string; input: Partial<BrandInput> }) =>
      updateBrand(getToken, id, input),
    rbac: { permission: 'products.manage' },
    onSuccess: () => {
      toast.success('Brand updated.')
      void queryClient.invalidateQueries({ queryKey: brandsKey })
    },
    onError: (error: Error) =>
      toast.error('Unable to update brand', { description: error.message }),
  })
}

export function useDeleteBrand() {
  const queryClient = useQueryClient()
  return useAuthMutation({
    mutationFn: (getToken, id: string) => deleteBrand(getToken, id),
    rbac: { permission: 'products.manage' },
    onSuccess: () => {
      toast.success('Brand deleted.')
      void queryClient.invalidateQueries({ queryKey: brandsKey })
    },
    onError: (error: Error) =>
      toast.error('Unable to delete brand', { description: error.message }),
  })
}
