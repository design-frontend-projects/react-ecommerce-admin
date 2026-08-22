import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthMutation } from '@/hooks/use-auth-mutation'
import { useAuthQuery } from '@/hooks/use-auth-query'
import {
  createSalesShipmentAction,
  dispatchSalesShipmentAction,
  fetchSalesShipments,
} from '../data/actions'
import type { CreateShipmentInput } from '../data/schema'

export function useSalesShipments() {
  return useAuthQuery({
    queryKey: ['inventory', 'sales-shipments'],
    queryFn: (getToken) => fetchSalesShipments(getToken),
    rbac: { permission: 'inventory.stock.view' },
  })
}

export function useCreateSalesShipment() {
  const queryClient = useQueryClient()
  return useAuthMutation({
    mutationFn: (getToken, input: CreateShipmentInput) =>
      createSalesShipmentAction(getToken, input),
    rbac: { permission: 'inventory.stock.manage' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'sales-shipments'] })
      queryClient.invalidateQueries({ queryKey: ['inventory', 'movements'] })
      queryClient.invalidateQueries({ queryKey: ['stock-balances'] })
      toast.success('Sales shipment created successfully.')
    },
    onError: (error) => {
      toast.error('Failed to create shipment', {
        description: (error as Error).message,
      })
    },
  })
}

export function useDispatchSalesShipment() {
  const queryClient = useQueryClient()
  return useAuthMutation({
    mutationFn: (getToken, id: string) =>
      dispatchSalesShipmentAction(getToken, id),
    rbac: { permission: 'inventory.stock.manage' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'sales-shipments'] })
      queryClient.invalidateQueries({ queryKey: ['inventory', 'movements'] })
      queryClient.invalidateQueries({ queryKey: ['stock-balances'] })
      toast.success('Shipment dispatched and stock deducted.')
    },
    onError: (error) => {
      toast.error('Failed to dispatch shipment', {
        description: (error as Error).message,
      })
    },
  })
}
