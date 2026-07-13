import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
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
  const { getToken, isLoaded, isSignedIn } = useAuth()
  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: receiptsKey,
    queryFn: () => fetchReceipts(getToken),
    enabled: isLoaded && isSignedIn,
  })
}

export function useReceipt(id: string | undefined) {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: receiptKey(id ?? ''),
    queryFn: () => fetchReceipt(getToken, id as string),
    enabled: Boolean(id) && isLoaded && isSignedIn,
  })
}

export function useCreateReceipt() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateReceiptInput) => createReceipt(getToken, input),
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
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => cancelReceipt(getToken, id),
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
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => postReceipt(getToken, id),
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
