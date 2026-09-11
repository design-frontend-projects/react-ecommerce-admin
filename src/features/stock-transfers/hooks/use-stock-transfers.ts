import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { useAuthMutation } from '@/hooks/use-auth-mutation'
import { useAuthQuery } from '@/hooks/use-auth-query'
import {
  approveTransfer,
  cancelTransfer,
  completeTransfer,
  createTransfer,
  fetchTransfer,
  fetchTransfers,
  pickTransfer,
  receiveTransfer,
  shipTransfer,
  updateTransfer,
} from '../data/actions'
import type { CreateTransferInput, UpdateTransferInput } from '../data/schema'

const transfersKey = ['inventory', 'stock-transfers'] as const
const transferKey = (id: string) =>
  ['inventory', 'stock-transfers', id] as const

export function useTransfers() {
  return useAuthQuery({
    queryKey: transfersKey,
    queryFn: (getToken) => fetchTransfers(getToken),
    rbac: { permission: 'inventory.stock.view' },
  })
}

export function useTransfer(id: string | undefined) {
  return useAuthQuery({
    queryKey: transferKey(id ?? ''),
    queryFn: (getToken) => fetchTransfer(getToken, id as string),
    enabled: Boolean(id),
    rbac: { permission: 'inventory.stock.view' },
  })
}

export function useCreateTransfer() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useAuthMutation({
    mutationFn: (getToken, input: CreateTransferInput) =>
      createTransfer(getToken, input),
    rbac: { permission: 'inventory.stock.manage' },
    onSuccess: () => {
      toast.success(t('stockTransfers.toast.created', 'Transfer created.'))
      void queryClient.invalidateQueries({ queryKey: transfersKey })
    },
    onError: (error: Error) =>
      toast.error(t('stockTransfers.toast.createError', 'Unable to create transfer'), { description: error.message }),
  })
}

export function useUpdateTransfer() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useAuthMutation({
    mutationFn: (getToken, input: UpdateTransferInput) =>
      updateTransfer(getToken, input),
    rbac: { permission: 'inventory.stock.manage' },
    onSuccess: () => {
      toast.success(t('stockTransfers.toast.updated', 'Transfer updated.'))
      void queryClient.invalidateQueries({ queryKey: transfersKey })
    },
    onError: (error: Error) =>
      toast.error(t('stockTransfers.toast.updateError', 'Unable to update transfer'), { description: error.message }),
  })
}

export function useApproveTransfer() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useAuthMutation({
    mutationFn: (getToken, id: string) => approveTransfer(getToken, id),
    rbac: { permission: 'inventory.stock.manage' },
    onSuccess: () => {
      toast.success(t('stockTransfers.toast.approved', 'Transfer approved.'))
      void queryClient.invalidateQueries({ queryKey: transfersKey })
    },
    onError: (error: Error) =>
      toast.error(t('stockTransfers.toast.approveError', 'Unable to approve transfer'), { description: error.message }),
  })
}

export function usePickTransfer() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useAuthMutation({
    mutationFn: (getToken, id: string) => pickTransfer(getToken, id),
    rbac: { permission: 'inventory.stock.manage' },
    onSuccess: () => {
      toast.success(t('stockTransfers.toast.picked', 'Transfer items picked.'))
      void queryClient.invalidateQueries({ queryKey: transfersKey })
    },
    onError: (error: Error) =>
      toast.error(t('stockTransfers.toast.pickError', 'Unable to pick transfer'), { description: error.message }),
  })
}

export function useShipTransfer() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useAuthMutation({
    mutationFn: (getToken, id: string) => shipTransfer(getToken, id),
    rbac: { permission: 'inventory.stock.manage' },
    onSuccess: () => {
      toast.success(t('stockTransfers.toast.shipped', 'Transfer shipped — in transit.'))
      void queryClient.invalidateQueries({ queryKey: transfersKey })
    },
    onError: (error: Error) =>
      toast.error(t('stockTransfers.toast.shipError', 'Unable to ship transfer'), { description: error.message }),
  })
}

export function useReceiveTransfer() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useAuthMutation({
    mutationFn: (getToken, id: string) => receiveTransfer(getToken, id),
    rbac: { permission: 'inventory.stock.manage' },
    onSuccess: () => {
      toast.success(t('stockTransfers.toast.received', 'Transfer received. Stock balances updated.'))
      void queryClient.invalidateQueries({ queryKey: transfersKey })
    },
    onError: (error: Error) =>
      toast.error(t('stockTransfers.toast.receiveError', 'Unable to receive transfer'), { description: error.message }),
  })
}

export function useCompleteTransfer() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useAuthMutation({
    mutationFn: (getToken, id: string) => completeTransfer(getToken, id),
    rbac: { permission: 'inventory.stock.manage' },
    onSuccess: () => {
      toast.success(t('stockTransfers.toast.completed', 'Transfer marked complete.'))
      void queryClient.invalidateQueries({ queryKey: transfersKey })
    },
    onError: (error: Error) =>
      toast.error(t('stockTransfers.toast.completeError', 'Unable to complete transfer'), {
        description: error.message,
      }),
  })
}

export function useCancelTransfer() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useAuthMutation({
    mutationFn: (getToken, id: string) => cancelTransfer(getToken, id),
    rbac: { permission: 'inventory.stock.manage' },
    onSuccess: () => {
      toast.success(t('stockTransfers.toast.cancelled', 'Transfer cancelled.'))
      void queryClient.invalidateQueries({ queryKey: transfersKey })
    },
    onError: (error: Error) =>
      toast.error(t('stockTransfers.toast.cancelError', 'Unable to cancel transfer'), { description: error.message }),
  })
}

export function useApplyTransfer() {
  return useReceiveTransfer()
}
