import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()

  return useAuthMutation({
    mutationFn: (getToken, input: WarehouseInput) => createWarehouse(getToken, input),
    rbac: { permission: 'inventory.manage' },
    onSuccess: () => {
      toast.success(t('warehouses.toast.created', 'Warehouse created successfully'))
      void queryClient.invalidateQueries({ queryKey: warehousesKey })
      void queryClient.invalidateQueries({ queryKey: ['warehouses'] })
    },
    onError: (error: Error) =>
      toast.error(t('warehouses.toast.error', 'Unable to create warehouse'), {
        description: error.message,
      }),
  })
}

export function useUpdateWarehouse() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()

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
      toast.success(t('warehouses.toast.updated', 'Warehouse updated successfully'))
      void queryClient.invalidateQueries({ queryKey: warehousesKey })
      void queryClient.invalidateQueries({ queryKey: ['warehouses'] })
    },
    onError: (error: Error) =>
      toast.error(t('warehouses.toast.error', 'Unable to update warehouse'), {
        description: error.message,
      }),
  })
}

export function useDeleteWarehouse() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  return useAuthMutation({
    mutationFn: (getToken, id: string) => deleteWarehouse(getToken, id),
    rbac: { permission: 'inventory.manage' },
    onSuccess: () => {
      toast.success(t('warehouses.toast.deleted', 'Warehouse deleted successfully'))
      void queryClient.invalidateQueries({ queryKey: warehousesKey })
      void queryClient.invalidateQueries({ queryKey: ['warehouses'] })
    },
    onError: (error: Error) =>
      toast.error(t('warehouses.toast.deleteError', 'Unable to delete warehouse'), {
        description: error.message,
      }),
  })
}

export function useCreateLocation(warehouseId: string | undefined) {
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  return useAuthMutation({
    mutationFn: (getToken, input: LocationInput) =>
      createLocation(getToken, warehouseId as string, input),
    rbac: { permission: 'inventory.manage' },
    onSuccess: () => {
      toast.success(t('warehouses.toast.locationCreated', 'Location added successfully'))
      void queryClient.invalidateQueries({
        queryKey: locationsKey(warehouseId ?? ''),
      })
      void queryClient.invalidateQueries({ queryKey: warehousesKey })
    },
    onError: (error: Error) =>
      toast.error(t('warehouses.toast.error', 'Unable to add location'), {
        description: error.message,
      }),
  })
}

export function useDeleteLocation(warehouseId: string | undefined) {
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  return useAuthMutation({
    mutationFn: (getToken, id: string) => deleteLocation(getToken, id),
    rbac: { permission: 'inventory.manage' },
    onSuccess: () => {
      toast.success(t('warehouses.toast.locationDeleted', 'Location removed successfully'))
      void queryClient.invalidateQueries({
        queryKey: locationsKey(warehouseId ?? ''),
      })
      void queryClient.invalidateQueries({ queryKey: warehousesKey })
    },
    onError: (error: Error) =>
      toast.error(t('warehouses.toast.deleteError', 'Unable to delete location'), {
        description: error.message,
      }),
  })
}

