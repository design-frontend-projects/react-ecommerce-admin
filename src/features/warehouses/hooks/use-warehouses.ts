import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
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
  const { getToken, isLoaded, isSignedIn } = useAuth()
  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: warehousesKey,
    queryFn: () => fetchWarehouses(getToken),
    enabled: isLoaded && isSignedIn,
  })
}

export function useWarehouseLocations(warehouseId: string | undefined) {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: locationsKey(warehouseId ?? ''),
    queryFn: () => fetchLocations(getToken, warehouseId as string),
    enabled: Boolean(warehouseId) && isLoaded && isSignedIn,
  })
}

export function useCreateWarehouse() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: WarehouseInput) => createWarehouse(getToken, input),
    onSuccess: () => {
      toast.success('Warehouse created.')
      void queryClient.invalidateQueries({ queryKey: warehousesKey })
    },
    onError: (error: Error) =>
      toast.error('Unable to create warehouse', { description: error.message }),
  })
}

export function useUpdateWarehouse() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string
      input: Partial<WarehouseInput>
    }) => updateWarehouse(getToken, id, input),
    onSuccess: () => {
      toast.success('Warehouse updated.')
      void queryClient.invalidateQueries({ queryKey: warehousesKey })
    },
    onError: (error: Error) =>
      toast.error('Unable to update warehouse', { description: error.message }),
  })
}

export function useDeleteWarehouse() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteWarehouse(getToken, id),
    onSuccess: () => {
      toast.success('Warehouse deleted.')
      void queryClient.invalidateQueries({ queryKey: warehousesKey })
    },
    onError: (error: Error) =>
      toast.error('Unable to delete warehouse', { description: error.message }),
  })
}

export function useCreateLocation(warehouseId: string | undefined) {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: LocationInput) =>
      createLocation(getToken, warehouseId as string, input),
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
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteLocation(getToken, id),
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
