import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useAuthQuery } from '@/hooks/use-auth-query'
import { useAuthMutation } from '@/hooks/use-auth-mutation'
import {
  createBatch,
  deleteBatch,
  fetchBatches,
  runExpirySweep,
  setBatchStatus,
  updateBatch,
} from '../data/actions'
import type {
  BatchToggleStatus,
  CreateBatchInput,
  UpdateBatchInput,
} from '../data/schema'

export const batchesKey = ['inventory', 'batches'] as const

export function useBatches() {
  return useAuthQuery({
    queryKey: batchesKey,
    queryFn: (getToken) => fetchBatches(getToken),
    rbac: { permission: 'inventory.view' },
  })
}

export function useCreateBatch() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  return useAuthMutation({
    mutationFn: (getToken, input: CreateBatchInput) =>
      createBatch(getToken, input),
    rbac: { permission: 'inventory.manage' },
    onSuccess: () => {
      toast.success(
        t('batches.toast.created', 'Batch created successfully.')
      )
      void queryClient.invalidateQueries({ queryKey: batchesKey })
    },
    onError: (error: Error) =>
      toast.error(t('batches.toast.error', 'Failed to save batch'), {
        description: error.message,
      }),
  })
}

export function useUpdateBatch() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  return useAuthMutation({
    mutationFn: (
      getToken,
      { id, input }: { id: string; input: UpdateBatchInput }
    ) => updateBatch(getToken, id, input),
    rbac: { permission: 'inventory.manage' },
    onSuccess: () => {
      toast.success(
        t('batches.toast.updated', 'Batch updated successfully.')
      )
      void queryClient.invalidateQueries({ queryKey: batchesKey })
    },
    onError: (error: Error) =>
      toast.error(t('batches.toast.error', 'Failed to save batch'), {
        description: error.message,
      }),
  })
}

export function useDeleteBatch() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  return useAuthMutation({
    mutationFn: (getToken, id: string) => deleteBatch(getToken, id),
    rbac: { permission: 'inventory.manage' },
    onSuccess: () => {
      toast.success(
        t('batches.toast.deleted', 'Batch deleted successfully.')
      )
      void queryClient.invalidateQueries({ queryKey: batchesKey })
    },
    onError: (error: Error) =>
      toast.error(t('batches.toast.error', 'Failed to delete batch'), {
        description: error.message,
      }),
  })
}

export function useSetBatchStatus() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  return useAuthMutation({
    mutationFn: (
      getToken,
      { id, status }: { id: string; status: BatchToggleStatus }
    ) => setBatchStatus(getToken, id, status),
    rbac: { permission: 'inventory.manage' },
    onSuccess: (_data, variables) => {
      toast.success(
        variables.status === 'blocked'
          ? t('batches.toast.blocked', 'Batch blocked from picking.')
          : t('batches.toast.unblocked', 'Batch unblocked and active for picking.')
      )
      void queryClient.invalidateQueries({ queryKey: batchesKey })
    },
    onError: (error: Error) =>
      toast.error(t('batches.toast.error', 'Failed to update batch status'), {
        description: error.message,
      }),
  })
}

export function useExpireBatches() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  return useAuthMutation({
    mutationFn: (getToken) => runExpirySweep(getToken),
    rbac: { permission: 'inventory.manage' },
    onSuccess: (data) => {
      toast.success(t('batches.toast.sweepSuccess', 'Expiry sweep complete.'), {
        description: t('batches.toast.sweepCount', {
          count: data.expired,
          defaultValue: `${data.expired} batch(es) marked as expired.`,
        }),
      })
      void queryClient.invalidateQueries({ queryKey: batchesKey })
    },
    onError: (error: Error) =>
      toast.error(
        t('batches.toast.error', 'Unable to run the expiry sweep'),
        { description: error.message }
      ),
  })
}
