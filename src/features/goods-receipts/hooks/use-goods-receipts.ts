import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { useAuthQuery } from '@/hooks/use-auth-query'
import { useAuthMutation } from '@/hooks/use-auth-mutation'
import {
  cancelReceipt,
  createReceipt,
  fetchReceipt,
  fetchReceipts,
  fetchReceivablePurchaseOrders,
  postReceipt,
} from '../data/actions'
import type { CreateReceiptInput } from '../data/schema'

const receiptsKey = ['inventory', 'goods-receipts'] as const
const receivablePosKey = ['inventory', 'goods-receipts', 'receivable-pos'] as const
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

export function useReceivablePurchaseOrders() {
  return useAuthQuery({
    queryKey: receivablePosKey,
    queryFn: (getToken) => fetchReceivablePurchaseOrders(getToken),
    rbac: { permission: 'purchasing.view' },
  })
}

export function useCreateReceipt() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  return useAuthMutation({
    mutationFn: (getToken, input: CreateReceiptInput) => createReceipt(getToken, input),
    rbac: { permission: 'purchasing.manage' },
    onSuccess: () => {
      toast.success(
        t('goodsReceipts.toast.created', {
          defaultValue: 'Goods receipt created successfully.',
        })
      )
      void queryClient.invalidateQueries({ queryKey: receiptsKey })
      void queryClient.invalidateQueries({ queryKey: receivablePosKey })
      void queryClient.invalidateQueries({ queryKey: ['stock-balances'] })
      void queryClient.invalidateQueries({ queryKey: ['inventory', 'purchase-orders'] })
    },
    onError: (error: Error) =>
      toast.error(
        t('goodsReceipts.toast.error', {
          defaultValue: 'Unable to create goods receipt',
        }),
        { description: error.message }
      ),
  })
}

export function useCancelReceipt() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  return useAuthMutation({
    mutationFn: (getToken, id: string) => cancelReceipt(getToken, id),
    rbac: { permission: 'purchasing.manage' },
    onSuccess: () => {
      toast.success(
        t('goodsReceipts.toast.cancelledSuccess', {
          defaultValue: 'Goods receipt cancelled.',
        })
      )
      void queryClient.invalidateQueries({ queryKey: receiptsKey })
      void queryClient.invalidateQueries({ queryKey: receivablePosKey })
    },
    onError: (error: Error) =>
      toast.error(
        t('goodsReceipts.toast.error', {
          defaultValue: 'Unable to cancel goods receipt',
        }),
        { description: error.message }
      ),
  })
}

export function usePostReceipt() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  return useAuthMutation({
    mutationFn: (getToken, id: string) => postReceipt(getToken, id),
    rbac: { permission: 'purchasing.manage' },
    onSuccess: () => {
      toast.success(
        t('goodsReceipts.toast.postedSuccess', {
          defaultValue: 'Receipt posted successfully! Stock balances and purchase order updated.',
        })
      )
      void queryClient.invalidateQueries({ queryKey: receiptsKey })
      void queryClient.invalidateQueries({ queryKey: receivablePosKey })
      void queryClient.invalidateQueries({ queryKey: ['stock-balances'] })
      void queryClient.invalidateQueries({ queryKey: ['inventory', 'stock-by-location'] })
      void queryClient.invalidateQueries({ queryKey: ['inventory', 'purchase-orders'] })
    },
    onError: (error: Error) =>
      toast.error(
        t('goodsReceipts.toast.error', {
          defaultValue: 'Unable to post goods receipt',
        }),
        { description: error.message }
      ),
  })
}
