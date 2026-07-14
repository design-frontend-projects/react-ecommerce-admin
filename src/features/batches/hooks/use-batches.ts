import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import { fetchBatches, runExpirySweep, setBatchStatus } from '../data/actions'
import type { BatchToggleStatus } from '../data/schema'

const batchesKey = ['inventory', 'batches'] as const

export function useBatches() {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: batchesKey,
    queryFn: () => fetchBatches(getToken),
    enabled: isLoaded && isSignedIn,
  })
}

export function useSetBatchStatus() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: BatchToggleStatus }) =>
      setBatchStatus(getToken, id, status),
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
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => runExpirySweep(getToken),
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
