import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import {
  createBrand,
  deleteBrand,
  fetchBrands,
  updateBrand,
} from '../data/actions'
import type { BrandInput } from '../data/schema'

const brandsKey = ['inventory', 'brands'] as const

export function useBrands() {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: brandsKey,
    queryFn: () => fetchBrands(getToken),
    enabled: isLoaded && isSignedIn,
  })
}

export function useCreateBrand() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: BrandInput) => createBrand(getToken, input),
    onSuccess: () => {
      toast.success('Brand created.')
      void queryClient.invalidateQueries({ queryKey: brandsKey })
    },
    onError: (error: Error) =>
      toast.error('Unable to create brand', { description: error.message }),
  })
}

export function useUpdateBrand() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<BrandInput> }) =>
      updateBrand(getToken, id, input),
    onSuccess: () => {
      toast.success('Brand updated.')
      void queryClient.invalidateQueries({ queryKey: brandsKey })
    },
    onError: (error: Error) =>
      toast.error('Unable to update brand', { description: error.message }),
  })
}

export function useDeleteBrand() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteBrand(getToken, id),
    onSuccess: () => {
      toast.success('Brand deleted.')
      void queryClient.invalidateQueries({ queryKey: brandsKey })
    },
    onError: (error: Error) =>
      toast.error('Unable to delete brand', { description: error.message }),
  })
}
