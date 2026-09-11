import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { useAuthQuery } from '@/hooks/use-auth-query'
import { useAuthMutation } from '@/hooks/use-auth-mutation'
import {
  assignWarehouseToStore,
  fetchStoreWarehouses,
  fetchWarehouseStores,
  removeStoreWarehouseLink,
  reorderStoreWarehouses,
  updateStoreWarehouseLink,
} from '../data/store-warehouses-actions'
import type {
  StoreWarehouseInput,
  StoreWarehouseUpdateInput,
} from '../data/store-warehouses-schema'

export const storeWarehousesKey = (storeId: string) =>
  ['stores', storeId, 'warehouses'] as const

export const warehouseStoresKey = (warehouseId: string) =>
  ['warehouses', warehouseId, 'stores'] as const

export function useStoreWarehouses(storeId: string | undefined) {
  return useAuthQuery({
    queryKey: storeWarehousesKey(storeId ?? ''),
    queryFn: (getToken) => fetchStoreWarehouses(getToken, storeId as string),
    enabled: Boolean(storeId),
    rbac: { permission: 'inventory.view' },
  })
}

export function useWarehouseStores(warehouseId: string | undefined) {
  return useAuthQuery({
    queryKey: warehouseStoresKey(warehouseId ?? ''),
    queryFn: (getToken) => fetchWarehouseStores(getToken, warehouseId as string),
    enabled: Boolean(warehouseId),
    rbac: { permission: 'inventory.view' },
  })
}

export function useAssignStoreWarehouse() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  return useAuthMutation({
    mutationFn: (getToken, input: StoreWarehouseInput) =>
      assignWarehouseToStore(getToken, input),
    rbac: { permission: 'inventory.manage' },
    onSuccess: (_data, variables) => {
      toast.success(
        t('stores.warehouses.toast.assigned', 'Warehouse linked successfully')
      )
      void queryClient.invalidateQueries({
        queryKey: storeWarehousesKey(variables.storeId),
      })
      void queryClient.invalidateQueries({
        queryKey: warehouseStoresKey(variables.warehouseId),
      })
      void queryClient.invalidateQueries({ queryKey: ['inventory', 'warehouses'] })
      void queryClient.invalidateQueries({ queryKey: ['warehouses'] })
      void queryClient.invalidateQueries({ queryKey: ['stores'] })
    },
    onError: (error: Error) =>
      toast.error(
        t('stores.warehouses.toast.assignError', 'Unable to link warehouse'),
        { description: error.message }
      ),
  })
}

export function useUpdateStoreWarehouse() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  return useAuthMutation({
    mutationFn: (
      getToken,
      {
        id,
        storeId,
        warehouseId,
        input,
      }: {
        id: string
        storeId?: string
        warehouseId?: string
        input: StoreWarehouseUpdateInput
      }
    ) => updateStoreWarehouseLink(getToken, id, input),
    rbac: { permission: 'inventory.manage' },
    onSuccess: (_data, variables) => {
      toast.success(
        t('stores.warehouses.toast.updated', 'Warehouse settings updated')
      )
      if (variables.storeId) {
        void queryClient.invalidateQueries({
          queryKey: storeWarehousesKey(variables.storeId),
        })
      }
      if (variables.warehouseId) {
        void queryClient.invalidateQueries({
          queryKey: warehouseStoresKey(variables.warehouseId),
        })
      }
      void queryClient.invalidateQueries({ queryKey: ['inventory', 'warehouses'] })
      void queryClient.invalidateQueries({ queryKey: ['warehouses'] })
      void queryClient.invalidateQueries({ queryKey: ['stores'] })
    },
    onError: (error: Error) =>
      toast.error(
        t('stores.warehouses.toast.updateError', 'Unable to update warehouse link'),
        { description: error.message }
      ),
  })
}

export function useReorderStoreWarehouses() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  return useAuthMutation({
    mutationFn: (
      getToken,
      {
        storeId,
        orderedIds,
      }: {
        storeId: string
        orderedIds: string[]
      }
    ) => reorderStoreWarehouses(getToken, storeId, orderedIds),
    rbac: { permission: 'inventory.manage' },
    onSuccess: (_data, variables) => {
      toast.success(
        t('stores.warehouses.toast.reordered', 'Fulfillment priority updated')
      )
      void queryClient.invalidateQueries({
        queryKey: storeWarehousesKey(variables.storeId),
      })
    },
    onError: (error: Error) =>
      toast.error(
        t('stores.warehouses.toast.reorderError', 'Unable to update priority'),
        { description: error.message }
      ),
  })
}

export function useRemoveStoreWarehouse() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  return useAuthMutation({
    mutationFn: (
      getToken,
      {
        id,
        storeId,
        warehouseId,
      }: {
        id: string
        storeId?: string
        warehouseId?: string
      }
    ) => removeStoreWarehouseLink(getToken, id),
    rbac: { permission: 'inventory.manage' },
    onSuccess: (_data, variables) => {
      toast.success(
        t('stores.warehouses.toast.removed', 'Warehouse unlinked successfully')
      )
      if (variables.storeId) {
        void queryClient.invalidateQueries({
          queryKey: storeWarehousesKey(variables.storeId),
        })
      }
      if (variables.warehouseId) {
        void queryClient.invalidateQueries({
          queryKey: warehouseStoresKey(variables.warehouseId),
        })
      }
      void queryClient.invalidateQueries({ queryKey: ['inventory', 'warehouses'] })
      void queryClient.invalidateQueries({ queryKey: ['warehouses'] })
      void queryClient.invalidateQueries({ queryKey: ['stores'] })
    },
    onError: (error: Error) =>
      toast.error(
        t('stores.warehouses.toast.removeError', 'Unable to unlink warehouse'),
        { description: error.message }
      ),
  })
}
