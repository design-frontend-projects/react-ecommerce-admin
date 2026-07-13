import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import { createOrder, fetchOrder, fetchOrders, runOrderAction } from '../data/actions'
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
  const { getToken, isLoaded, isSignedIn } = useAuth()
  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: ordersKey,
    queryFn: () => fetchOrders(getToken),
    enabled: isLoaded && isSignedIn,
  })
}

export function useOrder(id: string | undefined) {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: orderKey(id ?? ''),
    queryFn: () => fetchOrder(getToken, id as string),
    enabled: Boolean(id) && isLoaded && isSignedIn,
  })
}

export function useCreateOrder() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateOrderInput) => createOrder(getToken, input),
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
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: OrderAction }) =>
      runOrderAction(getToken, id, action),
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
