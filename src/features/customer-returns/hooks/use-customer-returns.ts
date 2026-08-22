import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthMutation } from '@/hooks/use-auth-mutation'
import { useAuthQuery } from '@/hooks/use-auth-query'
import {
  createCustomerReturnAction,
  fetchCustomerReturns,
  receiveCustomerReturnAction,
} from '../data/actions'
import type { CreateCustomerReturnInput } from '../data/schema'

export function useCustomerReturns() {
  return useAuthQuery({
    queryKey: ['inventory', 'customer-returns'],
    queryFn: (getToken) => fetchCustomerReturns(getToken),
    rbac: { permission: 'inventory.stock.view' },
  })
}

export function useCreateCustomerReturn() {
  const queryClient = useQueryClient()
  return useAuthMutation({
    mutationFn: (getToken, input: CreateCustomerReturnInput) =>
      createCustomerReturnAction(getToken, input),
    rbac: { permission: 'inventory.stock.manage' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'customer-returns'] })
      queryClient.invalidateQueries({ queryKey: ['inventory', 'movements'] })
      queryClient.invalidateQueries({ queryKey: ['stock-balances'] })
      toast.success('Customer return created successfully.')
    },
    onError: (error) => {
      toast.error('Failed to create customer return', {
        description: (error as Error).message,
      })
    },
  })
}

export function useReceiveCustomerReturn() {
  const queryClient = useQueryClient()
  return useAuthMutation({
    mutationFn: (getToken, id: string) =>
      receiveCustomerReturnAction(getToken, id),
    rbac: { permission: 'inventory.stock.manage' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'customer-returns'] })
      queryClient.invalidateQueries({ queryKey: ['inventory', 'movements'] })
      queryClient.invalidateQueries({ queryKey: ['stock-balances'] })
      toast.success('Return received and inventory updated.')
    },
    onError: (error) => {
      toast.error('Failed to receive return', {
        description: (error as Error).message,
      })
    },
  })
}
