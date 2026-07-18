import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthQuery } from '@/hooks/use-auth-query'
import { useAuthMutation } from '@/hooks/use-auth-mutation'
import {
  createOrder,
  fetchOrder,
  fetchOrders,
  runOrderAction,
} from '../data/actions'
import type { CreateOrderInput, OrderAction } from '../data/schema'

const ordersKey = ['inventory', 'sales-orders'] as const
const orderKey = (id: string) => ['inventory', 'sales-orders', id] as const

const ACTION_SUCCESS: Record<OrderAction, string> = {
  confirm: 'Order confirmed. Stock reserved.',
  picking: 'Picking started.',
  packed: 'Order marked as packed.',
  fulfill: 'Order fulfilled. Stock updated.',
  invoice: 'Invoice created.',
  cancel: 'Order cancelled. Reservations released.',
  complete: 'Order completed.',
}

export function useOrders() {
  return useAuthQuery({
    queryKey: ordersKey,
    queryFn: (getToken) => fetchOrders(getToken),
    rbac: { permission: 'sales.view' },
  })
}

export function useOrder(id: string | undefined) {
  return useAuthQuery({
    queryKey: orderKey(id ?? ''),
    queryFn: (getToken) => fetchOrder(getToken, id as string),
    enabled: Boolean(id),
    rbac: { permission: 'sales.view' },
  })
}

export function useCreateOrder() {
  const queryClient = useQueryClient()
  return useAuthMutation({
    mutationFn: (getToken, input: CreateOrderInput) => createOrder(getToken, input),
    rbac: { permission: 'sales.manage' },
    onSuccess: () => {
      toast.success('Sales order created.')
      void queryClient.invalidateQueries({ queryKey: ordersKey })
    },
    onError: (error: Error) =>
      toast.error('Unable to create sales order', {
        description: error.message,
      }),
  })
}

export function useOrderAction() {
  const queryClient = useQueryClient()
  return useAuthMutation({
    mutationFn: (getToken, { id, action }: { id: string; action: OrderAction }) =>
      runOrderAction(getToken, id, action),
    rbac: { permission: 'sales.manage' },
    onSuccess: (_data, variables) => {
      toast.success(ACTION_SUCCESS[variables.action])
      void queryClient.invalidateQueries({ queryKey: ordersKey })
    },
    onError: (error: Error) =>
      toast.error('Unable to update sales order', {
        description: error.message,
      }),
  })
}
