import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { useAuthQuery } from '@/hooks/use-auth-query'
import { useAuthMutation } from '@/hooks/use-auth-mutation'
import {
  cancelCount,
  createCount,
  fetchCount,
  fetchCounts,
  runCountAction,
} from '../data/actions'
import type {
  CountAction,
  CountEntryInput,
  CreateCountInput,
} from '../data/schema'

const countsKey = ['inventory', 'stock-counts'] as const
const countKey = (id: string) => ['inventory', 'stock-counts', id] as const

export function useCounts() {
  return useAuthQuery({
    queryKey: countsKey,
    queryFn: (getToken) => fetchCounts(getToken),
    rbac: { permission: 'inventory.view' },
  })
}

export function useCount(id: string | undefined) {
  return useAuthQuery({
    queryKey: countKey(id ?? ''),
    queryFn: (getToken) => fetchCount(getToken, id as string),
    enabled: Boolean(id),
    rbac: { permission: 'inventory.view' },
  })
}

export function useCreateCount() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useAuthMutation({
    mutationFn: (getToken, input: CreateCountInput) => createCount(getToken, input),
    rbac: { permission: 'inventory.manage' },
    onSuccess: () => {
      toast.success(t('stockCounts.toast.created', 'Stock count created.'))
      void queryClient.invalidateQueries({ queryKey: countsKey })
    },
    onError: (error: Error) =>
      toast.error(t('stockCounts.toast.createError', 'Unable to create stock count'), {
        description: error.message,
      }),
  })
}

export function useCancelCount() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useAuthMutation({
    mutationFn: (getToken, id: string) => cancelCount(getToken, id),
    rbac: { permission: 'inventory.manage' },
    onSuccess: () => {
      toast.success(t('stockCounts.toast.cancelled', 'Stock count cancelled.'))
      void queryClient.invalidateQueries({ queryKey: countsKey })
    },
    onError: (error: Error) =>
      toast.error(t('stockCounts.toast.cancelError', 'Unable to cancel stock count'), {
        description: error.message,
      }),
  })
}

export function useCountAction() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useAuthMutation({
    mutationFn: (
      getToken,
      {
        id,
        action,
        entries,
      }: {
        id: string
        action: CountAction
        entries?: CountEntryInput[]
      }
    ) => runCountAction(getToken, id, action, entries),
    rbac: { permission: 'inventory.manage' },
    onSuccess: (_data, variables) => {
      const actionSuccess: Record<CountAction, string> = {
        snapshot: t('stockCounts.toast.actions.snapshot', 'Counting started. Expected quantities frozen.'),
        save: t('stockCounts.toast.actions.save', 'Counts saved.'),
        review: t('stockCounts.toast.actions.review', 'Count sent to review. Variances computed.'),
        post: t('stockCounts.toast.actions.post', 'Count posted. Variances applied as an adjustment.'),
      }
      toast.success(actionSuccess[variables.action] ?? t('stockCounts.toast.updated', 'Count updated successfully'))
      void queryClient.invalidateQueries({ queryKey: countsKey })
    },
    onError: (error: Error) =>
      toast.error(t('stockCounts.toast.updateError', 'Unable to update stock count'), {
        description: error.message,
      }),
  })
}
