import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthQuery } from '@/hooks/use-auth-query'
import { useAuthMutation } from '@/hooks/use-auth-mutation'
import {
  applyTransfer,
  cancelTransfer,
  createTransfer,
  fetchTransfer,
  fetchTransfers,
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
    rbac: { permission: 'inventory.view' },
  })
}

export function useTransfer(id: string | undefined) {
  return useAuthQuery({
    queryKey: transferKey(id ?? ''),
    queryFn: (getToken) => fetchTransfer(getToken, id as string),
    enabled: Boolean(id),
    rbac: { permission: 'inventory.view' },
  })
}

export function useCreateTransfer() {
  const queryClient = useQueryClient()
  return useAuthMutation({
    mutationFn: (getToken, input: CreateTransferInput) => createTransfer(getToken, input),
    rbac: { permission: 'inventory.manage' },
    onSuccess: () => {
      toast.success('Transfer created.')
      void queryClient.invalidateQueries({ queryKey: transfersKey })
    },
    onError: (error: Error) =>
      toast.error('Unable to create transfer', { description: error.message }),
  })
}

export function useUpdateTransfer() {
  const queryClient = useQueryClient()
  return useAuthMutation({
    mutationFn: (getToken, input: UpdateTransferInput) => updateTransfer(getToken, input),
    rbac: { permission: 'inventory.manage' },
    onSuccess: () => {
      toast.success('Transfer updated.')
      void queryClient.invalidateQueries({ queryKey: transfersKey })
    },
    onError: (error: Error) =>
      toast.error('Unable to update transfer', { description: error.message }),
  })
}

export function useCancelTransfer() {
  const queryClient = useQueryClient()
  return useAuthMutation({
    mutationFn: (getToken, id: string) => cancelTransfer(getToken, id),
    rbac: { permission: 'inventory.manage' },
    onSuccess: () => {
      toast.success('Transfer cancelled.')
      void queryClient.invalidateQueries({ queryKey: transfersKey })
    },
    onError: (error: Error) =>
      toast.error('Unable to cancel transfer', { description: error.message }),
  })
}

export function useApplyTransfer() {
  const queryClient = useQueryClient()
  return useAuthMutation({
    mutationFn: (getToken, id: string) => applyTransfer(getToken, id),
    rbac: { permission: 'inventory.manage' },
    onSuccess: () => {
      toast.success('Transfer applied. Stock balances updated.')
      void queryClient.invalidateQueries({ queryKey: transfersKey })
    },
    onError: (error: Error) =>
      toast.error('Unable to apply transfer', { description: error.message }),
  })
}
