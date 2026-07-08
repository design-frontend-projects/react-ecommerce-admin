import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import {
  applyTransfer,
  cancelTransfer,
  createTransfer,
  fetchTransfer,
  fetchTransfers,
  updateTransfer,
} from '../data/actions'
import type {
  CreateTransferInput,
  UpdateTransferInput,
} from '../data/schema'

const transfersKey = ['inventory', 'stock-transfers'] as const
const transferKey = (id: string) =>
  ['inventory', 'stock-transfers', id] as const

export function useTransfers() {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: transfersKey,
    queryFn: () => fetchTransfers(getToken),
    enabled: isLoaded && isSignedIn,
  })
}

export function useTransfer(id: string | undefined) {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: transferKey(id ?? ''),
    queryFn: () => fetchTransfer(getToken, id as string),
    enabled: Boolean(id) && isLoaded && isSignedIn,
  })
}

export function useCreateTransfer() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateTransferInput) => createTransfer(getToken, input),
    onSuccess: () => {
      toast.success('Transfer created.')
      void queryClient.invalidateQueries({ queryKey: transfersKey })
    },
    onError: (error: Error) =>
      toast.error('Unable to create transfer', { description: error.message }),
  })
}

export function useUpdateTransfer() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateTransferInput) => updateTransfer(getToken, input),
    onSuccess: () => {
      toast.success('Transfer updated.')
      void queryClient.invalidateQueries({ queryKey: transfersKey })
    },
    onError: (error: Error) =>
      toast.error('Unable to update transfer', { description: error.message }),
  })
}

export function useCancelTransfer() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => cancelTransfer(getToken, id),
    onSuccess: () => {
      toast.success('Transfer cancelled.')
      void queryClient.invalidateQueries({ queryKey: transfersKey })
    },
    onError: (error: Error) =>
      toast.error('Unable to cancel transfer', { description: error.message }),
  })
}

export function useApplyTransfer() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => applyTransfer(getToken, id),
    onSuccess: () => {
      toast.success('Transfer applied. Stock balances updated.')
      void queryClient.invalidateQueries({ queryKey: transfersKey })
    },
    onError: (error: Error) =>
      toast.error('Unable to apply transfer', { description: error.message }),
  })
}
