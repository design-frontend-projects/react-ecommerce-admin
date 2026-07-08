import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import {
  applyAdjustment,
  cancelAdjustment,
  createAdjustment,
  fetchAdjustment,
  fetchAdjustments,
} from '../data/actions'
import type { CreateAdjustmentInput } from '../data/schema'

const adjustmentsKey = ['inventory', 'stock-adjustments'] as const
const adjustmentKey = (id: string) =>
  ['inventory', 'stock-adjustments', id] as const

export function useAdjustments() {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: adjustmentsKey,
    queryFn: () => fetchAdjustments(getToken),
    enabled: isLoaded && isSignedIn,
  })
}

export function useAdjustment(id: string | undefined) {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: adjustmentKey(id ?? ''),
    queryFn: () => fetchAdjustment(getToken, id as string),
    enabled: Boolean(id) && isLoaded && isSignedIn,
  })
}

export function useCreateAdjustment() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateAdjustmentInput) =>
      createAdjustment(getToken, input),
    onSuccess: () => {
      toast.success('Adjustment created.')
      void queryClient.invalidateQueries({ queryKey: adjustmentsKey })
    },
    onError: (error: Error) =>
      toast.error('Unable to create adjustment', {
        description: error.message,
      }),
  })
}

export function useCancelAdjustment() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => cancelAdjustment(getToken, id),
    onSuccess: () => {
      toast.success('Adjustment cancelled.')
      void queryClient.invalidateQueries({ queryKey: adjustmentsKey })
    },
    onError: (error: Error) =>
      toast.error('Unable to cancel adjustment', {
        description: error.message,
      }),
  })
}

export function useApplyAdjustment() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => applyAdjustment(getToken, id),
    onSuccess: () => {
      toast.success('Adjustment applied. Stock balances updated.')
      void queryClient.invalidateQueries({ queryKey: adjustmentsKey })
    },
    onError: (error: Error) =>
      toast.error('Unable to apply adjustment', {
        description: error.message,
      }),
  })
}
