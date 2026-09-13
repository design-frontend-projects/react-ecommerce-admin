import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthQuery } from '@/hooks/use-auth-query'
import { useAuthMutation } from '@/hooks/use-auth-mutation'
import {
  createFinancialTransactionAction,
  fetchFinancialTransaction,
  fetchFinancialTransactions,
  fetchFinancialTransactionStats,
  refundFinancialTransactionAction,
  updateFinancialTransactionStatusAction,
  type FetchFinancialTransactionsParams,
} from '../data/actions'
import type {
  CreateFinancialTransactionFormValues,
  RefundFinancialTransactionFormValues,
} from '../data/schema'

export const financialTransactionsKey = (params?: FetchFinancialTransactionsParams) =>
  ['financial-transactions', 'list', params] as const

export const financialTransactionDetailKey = (id: string) =>
  ['financial-transactions', 'detail', id] as const

export const financialTransactionStatsKey = () =>
  ['financial-transactions', 'stats'] as const

export function useFinancialTransactions(
  params: FetchFinancialTransactionsParams = {}
) {
  return useAuthQuery({
    queryKey: financialTransactionsKey(params),
    queryFn: (getToken) => fetchFinancialTransactions(getToken, params),
    rbac: { permission: 'inventory.stock.view' },
  })
}

export function useFinancialTransaction(id: string | undefined | null) {
  return useAuthQuery({
    queryKey: financialTransactionDetailKey(id ?? ''),
    queryFn: (getToken) => fetchFinancialTransaction(getToken, id as string),
    enabled: Boolean(id),
    rbac: { permission: 'inventory.stock.view' },
  })
}

export function useFinancialTransactionStats() {
  return useAuthQuery({
    queryKey: financialTransactionStatsKey(),
    queryFn: (getToken) => fetchFinancialTransactionStats(getToken),
    rbac: { permission: 'inventory.stock.view' },
  })
}

export function useCreateFinancialTransaction() {
  const queryClient = useQueryClient()
  return useAuthMutation({
    mutationFn: (getToken, input: CreateFinancialTransactionFormValues) =>
      createFinancialTransactionAction(getToken, input),
    rbac: { permission: 'inventory.stock.manage' },
    onSuccess: (data) => {
      toast.success('Transaction created successfully', {
        description: `Transaction #${data.transaction_number} recorded.`,
      })
      void queryClient.invalidateQueries({ queryKey: ['financial-transactions'] })
    },
    onError: (error: Error) =>
      toast.error('Failed to create transaction', {
        description: error.message,
      }),
  })
}

export function useUpdateFinancialTransactionStatus() {
  const queryClient = useQueryClient()
  return useAuthMutation({
    mutationFn: (
      getToken,
      input: { id: string; status: string; notes?: string }
    ) =>
      updateFinancialTransactionStatusAction(
        getToken,
        input.id,
        input.status,
        input.notes
      ),
    rbac: { permission: 'inventory.stock.manage' },
    onSuccess: (data) => {
      toast.success('Status updated', {
        description: `Transaction status is now ${data.status}.`,
      })
      void queryClient.invalidateQueries({ queryKey: ['financial-transactions'] })
    },
    onError: (error: Error) =>
      toast.error('Failed to update status', {
        description: error.message,
      }),
  })
}

export function useRefundFinancialTransaction() {
  const queryClient = useQueryClient()
  return useAuthMutation({
    mutationFn: (getToken, input: RefundFinancialTransactionFormValues) =>
      refundFinancialTransactionAction(getToken, input),
    rbac: { permission: 'inventory.stock.manage' },
    onSuccess: (data) => {
      toast.success('Refund issued successfully', {
        description: `Refund #${data.refund_transaction_number} issued. Parent status: ${data.parent_status}.`,
      })
      void queryClient.invalidateQueries({ queryKey: ['financial-transactions'] })
    },
    onError: (error: Error) =>
      toast.error('Failed to process refund', {
        description: error.message,
      }),
  })
}
