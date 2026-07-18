import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthQuery } from '@/hooks/use-auth-query'
import { useAuthMutation } from '@/hooks/use-auth-mutation'
import { fetchBatches, runExpirySweep, setBatchStatus } from '../data/actions'
import type { BatchToggleStatus } from '../data/schema'

const batchesKey = ['inventory', 'batches'] as const

export function useBatches() {
  return useAuthQuery({
    queryKey: batchesKey,
    queryFn: (getToken) => fetchBatches(getToken),
    rbac: { permission: 'inventory.view' },
  })
}

export function useSetBatchStatus() {
  const queryClient = useQueryClient()
  return useAuthMutation({
    mutationFn: (getToken, { id, status }: { id: string; status: BatchToggleStatus }) =>
      setBatchStatus(getToken, id, status),
    rbac: { permission: 'inventory.manage' },
    onSuccess: (_data, variables) => {
      toast.success(
        variables.status === 'blocked' ? 'Batch blocked.' : 'Batch unblocked.'
      )
      void queryClient.invalidateQueries({ queryKey: batchesKey })
    },
    onError: (error: Error) =>
      toast.error('Unable to update batch', { description: error.message }),
  })
}

export function useExpireBatches() {
  const queryClient = useQueryClient()
  return useAuthMutation({
    mutationFn: (getToken) => runExpirySweep(getToken),
    rbac: { permission: 'inventory.manage' },
    onSuccess: (data) => {
      toast.success('Expiry sweep complete.', {
        description: `${data.expired} batch(es) marked as expired.`,
      })
      void queryClient.invalidateQueries({ queryKey: batchesKey })
    },
    onError: (error: Error) =>
      toast.error('Unable to run the expiry sweep', {
        description: error.message,
      }),
  })
}
