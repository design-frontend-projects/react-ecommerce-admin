import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthQuery } from '@/hooks/use-auth-query'
import { useAuthMutation } from '@/hooks/use-auth-mutation'
import {
  createLocation,
  createWarehouse,
  deleteLocation,
  deleteWarehouse,
  fetchLocations,
  fetchWarehouses,
  updateWarehouse,
} from '../data/actions'
import type { LocationInput, WarehouseInput } from '../data/schema'

const warehousesKey = ['inventory', 'warehouses'] as const
const locationsKey = (warehouseId: string) =>
  ['inventory', 'warehouses', warehouseId, 'locations'] as const

export function useWarehouses() {
  return useAuthQuery({
    queryKey: warehousesKey,
    queryFn: (getToken) => fetchWarehouses(getToken),
    rbac: { permission: 'inventory.view' },
  })
}

export function useWarehouseLocations(warehouseId: string | undefined) {
  return useAuthQuery({
    queryKey: locationsKey(warehouseId ?? ''),
    queryFn: (getToken) => fetchLocations(getToken, warehouseId as string),
    enabled: Boolean(warehouseId),
    rbac: { permission: 'inventory.view' },
  })
}

export function useCreateWarehouse() {
  const queryClient = useQueryClient()
  return useAuthMutation({
    mutationFn: (getToken, input: WarehouseInput) => createWarehouse(getToken, input),
    rbac: { permission: 'inventory.manage' },
    onSuccess: () => {
      toast.success('Warehouse created.')
      void queryClient.invalidateQueries({ queryKey: warehousesKey })
    },
    onError: (error: Error) =>
      toast.error('Unable to create warehouse', { description: error.message }),
  })
}

export function useUpdateWarehouse() {
  const queryClient = useQueryClient()
  return useAuthMutation({
    mutationFn: (
      getToken,
      {
        id,
        input,
      }: {
        id: string
        input: Partial<WarehouseInput>
      }
    ) => updateWarehouse(getToken, id, input),
    rbac: { permission: 'inventory.manage' },
    onSuccess: () => {
      toast.success('Warehouse updated.')
      void queryClient.invalidateQueries({ queryKey: warehousesKey })
    },
    onError: (error: Error) =>
      toast.error('Unable to update warehouse', { description: error.message }),
  })
}

export function useDeleteWarehouse() {
  const queryClient = useQueryClient()
  return useAuthMutation({
    mutationFn: (getToken, id: string) => deleteWarehouse(getToken, id),
    rbac: { permission: 'inventory.manage' },
    onSuccess: () => {
      toast.success('Warehouse deleted.')
      void queryClient.invalidateQueries({ queryKey: warehousesKey })
    },
    onError: (error: Error) =>
      toast.error('Unable to delete warehouse', { description: error.message }),
  })
}

export function useCreateLocation(warehouseId: string | undefined) {
  const queryClient = useQueryClient()
  return useAuthMutation({
    mutationFn: (getToken, input: LocationInput) =>
      createLocation(getToken, warehouseId as string, input),
    rbac: { permission: 'inventory.manage' },
    onSuccess: () => {
      toast.success('Location added.')
      void queryClient.invalidateQueries({
        queryKey: locationsKey(warehouseId ?? ''),
      })
      void queryClient.invalidateQueries({ queryKey: warehousesKey })
    },
    onError: (error: Error) =>
      toast.error('Unable to add location', { description: error.message }),
  })
}

export function useDeleteLocation(warehouseId: string | undefined) {
  const queryClient = useQueryClient()
  return useAuthMutation({
    mutationFn: (getToken, id: string) => deleteLocation(getToken, id),
    rbac: { permission: 'inventory.manage' },
    onSuccess: () => {
      toast.success('Location deleted.')
      void queryClient.invalidateQueries({
        queryKey: locationsKey(warehouseId ?? ''),
      })
      void queryClient.invalidateQueries({ queryKey: warehousesKey })
    },
    onError: (error: Error) =>
      toast.error('Unable to delete location', { description: error.message }),
  })
}
