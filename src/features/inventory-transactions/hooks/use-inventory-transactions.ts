import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthQuery } from '@/hooks/use-auth-query'
import { useAuthMutation } from '@/hooks/use-auth-mutation'
import {
  cancelInventoryTransactionAction,
  createInventoryTransactionAction,
  fetchInventoryTransaction,
  fetchInventoryTransactions,
  postInventoryTransactionAction,
  reverseInventoryTransactionAction,
  type FetchTransactionsParams,
} from '../data/actions'
import type { CreateTransactionInput } from '../data/schema'

export const inventoryTransactionsKey = (params?: FetchTransactionsParams) =>
  ['inventory', 'inventory-transactions', params] as const

export const inventoryTransactionKey = (id: string) =>
  ['inventory', 'inventory-transaction', id] as const

export function useInventoryTransactions(params: FetchTransactionsParams = {}) {
  return useAuthQuery({
    queryKey: inventoryTransactionsKey(params),
    queryFn: (getToken) => fetchInventoryTransactions(getToken, params),
    rbac: { permission: 'inventory.stock.view' },
  })
}

export function useInventoryTransaction(id: string | undefined) {
  return useAuthQuery({
    queryKey: inventoryTransactionKey(id ?? ''),
    queryFn: (getToken) => fetchInventoryTransaction(getToken, id as string),
    enabled: Boolean(id),
    rbac: { permission: 'inventory.stock.view' },
  })
}

export function useCreateInventoryTransaction() {
  const queryClient = useQueryClient()
  return useAuthMutation({
    mutationFn: (getToken, input: CreateTransactionInput) =>
      createInventoryTransactionAction(getToken, input),
    rbac: { permission: 'inventory.stock.manage' },
    onSuccess: () => {
      toast.success('Inventory transaction created successfully.')
      void queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
    onError: (error: Error) =>
      toast.error('Failed to create inventory transaction', {
        description: error.message,
      }),
  })
}

export function usePostInventoryTransaction() {
  const queryClient = useQueryClient()
  return useAuthMutation({
    mutationFn: (getToken, id: string) =>
      postInventoryTransactionAction(getToken, id),
    rbac: { permission: 'inventory.stock.manage' },
    onSuccess: () => {
      toast.success('Inventory transaction posted. Stock balances updated.')
      void queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
    onError: (error: Error) =>
      toast.error('Failed to post transaction', {
        description: error.message,
      }),
  })
}

export function useCancelInventoryTransaction() {
  const queryClient = useQueryClient()
  return useAuthMutation({
    mutationFn: (getToken, { id, reason }: { id: string; reason?: string }) =>
      cancelInventoryTransactionAction(getToken, id, reason),
    rbac: { permission: 'inventory.stock.manage' },
    onSuccess: () => {
      toast.success('Transaction cancelled.')
      void queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
    onError: (error: Error) =>
      toast.error('Failed to cancel transaction', {
        description: error.message,
      }),
  })
}

export function useReverseInventoryTransaction() {
  const queryClient = useQueryClient()
  return useAuthMutation({
    mutationFn: (getToken, { id, reason }: { id: string; reason: string }) =>
      reverseInventoryTransactionAction(getToken, id, reason),
    rbac: { permission: 'inventory.stock.manage' },
    onSuccess: () => {
      toast.success('Transaction reversed. Offsetting transaction posted.')
      void queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
    onError: (error: Error) =>
      toast.error('Failed to reverse transaction', {
        description: error.message,
      }),
  })
}
