import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthQuery } from '@/hooks/use-auth-query'
import { useAuthMutation } from '@/hooks/use-auth-mutation'
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
  return useAuthQuery({
    queryKey: adjustmentsKey,
    queryFn: (getToken) => fetchAdjustments(getToken),
    rbac: { permission: 'inventory.view' },
  })
}

export function useAdjustment(id: string | undefined) {
  return useAuthQuery({
    queryKey: adjustmentKey(id ?? ''),
    queryFn: (getToken) => fetchAdjustment(getToken, id as string),
    enabled: Boolean(id),
    rbac: { permission: 'inventory.view' },
  })
}

export function useCreateAdjustment() {
  const queryClient = useQueryClient()
  return useAuthMutation({
    mutationFn: (getToken, input: CreateAdjustmentInput) =>
      createAdjustment(getToken, input),
    rbac: { permission: 'inventory.manage' },
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
  const queryClient = useQueryClient()
  return useAuthMutation({
    mutationFn: (getToken, id: string) => cancelAdjustment(getToken, id),
    rbac: { permission: 'inventory.manage' },
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
  const queryClient = useQueryClient()
  return useAuthMutation({
    mutationFn: (getToken, id: string) => applyAdjustment(getToken, id),
    rbac: { permission: 'inventory.manage' },
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
