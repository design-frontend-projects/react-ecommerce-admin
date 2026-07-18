import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthQuery } from '@/hooks/use-auth-query'
import { useAuthMutation } from '@/hooks/use-auth-mutation'
import {
  cancelReceipt,
  createReceipt,
  fetchReceipt,
  fetchReceipts,
  postReceipt,
} from '../data/actions'
import type { CreateReceiptInput } from '../data/schema'

const receiptsKey = ['inventory', 'goods-receipts'] as const
const receiptKey = (id: string) => ['inventory', 'goods-receipts', id] as const

export function useReceipts() {
  return useAuthQuery({
    queryKey: receiptsKey,
    queryFn: (getToken) => fetchReceipts(getToken),
    rbac: { permission: 'purchasing.view' },
  })
}

export function useReceipt(id: string | undefined) {
  return useAuthQuery({
    queryKey: receiptKey(id ?? ''),
    queryFn: (getToken) => fetchReceipt(getToken, id as string),
    enabled: Boolean(id),
    rbac: { permission: 'purchasing.view' },
  })
}

export function useCreateReceipt() {
  const queryClient = useQueryClient()
  return useAuthMutation({
    mutationFn: (getToken, input: CreateReceiptInput) => createReceipt(getToken, input),
    rbac: { permission: 'purchasing.manage' },
    onSuccess: () => {
      toast.success('Goods receipt created as draft.')
      void queryClient.invalidateQueries({ queryKey: receiptsKey })
    },
    onError: (error: Error) =>
      toast.error('Unable to create goods receipt', {
        description: error.message,
      }),
  })
}

export function useCancelReceipt() {
  const queryClient = useQueryClient()
  return useAuthMutation({
    mutationFn: (getToken, id: string) => cancelReceipt(getToken, id),
    rbac: { permission: 'purchasing.manage' },
    onSuccess: () => {
      toast.success('Goods receipt cancelled.')
      void queryClient.invalidateQueries({ queryKey: receiptsKey })
    },
    onError: (error: Error) =>
      toast.error('Unable to cancel goods receipt', {
        description: error.message,
      }),
  })
}

export function usePostReceipt() {
  const queryClient = useQueryClient()
  return useAuthMutation({
    mutationFn: (getToken, id: string) => postReceipt(getToken, id),
    rbac: { permission: 'purchasing.manage' },
    onSuccess: () => {
      toast.success('Receipt posted. Stock balances updated.')
      void queryClient.invalidateQueries({ queryKey: receiptsKey })
      void queryClient.invalidateQueries({ queryKey: ['stock-balances'] })
      void queryClient.invalidateQueries({
        queryKey: ['inventory', 'stock-by-location'],
      })
    },
    onError: (error: Error) =>
      toast.error('Unable to post goods receipt', {
        description: error.message,
      }),
  })
}
