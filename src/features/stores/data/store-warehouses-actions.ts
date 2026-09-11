import { authorizedRequest, type TokenGetter } from '@/lib/authorized-request'
import {
  storeWarehouseInputSchema,
  storeWarehouseListResponseSchema,
  storeWarehouseUpdateSchema,
  type StoreWarehouseInput,
  type StoreWarehouseItem,
  type StoreWarehouseUpdateInput,
} from './store-warehouses-schema'

const BASE = '/api/inventory/store-warehouses'

export async function fetchStoreWarehouses(
  getToken: TokenGetter,
  storeId: string
): Promise<StoreWarehouseItem[]> {
  const payload = await authorizedRequest(
    getToken,
    `${BASE}?storeId=${encodeURIComponent(storeId)}`
  )
  return storeWarehouseListResponseSchema.parse(payload).data
}

export async function fetchWarehouseStores(
  getToken: TokenGetter,
  warehouseId: string
): Promise<StoreWarehouseItem[]> {
  const payload = await authorizedRequest(
    getToken,
    `${BASE}?warehouseId=${encodeURIComponent(warehouseId)}`
  )
  return storeWarehouseListResponseSchema.parse(payload).data
}

export async function assignWarehouseToStore(
  getToken: TokenGetter,
  input: StoreWarehouseInput
): Promise<void> {
  const body = storeWarehouseInputSchema.parse(input)
  await authorizedRequest(getToken, BASE, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function updateStoreWarehouseLink(
  getToken: TokenGetter,
  id: string,
  input: StoreWarehouseUpdateInput
): Promise<void> {
  const body = storeWarehouseUpdateSchema.parse(input)
  await authorizedRequest(getToken, `${BASE}?id=${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function reorderStoreWarehouses(
  getToken: TokenGetter,
  storeId: string,
  orderedIds: string[]
): Promise<void> {
  await authorizedRequest(getToken, BASE, {
    method: 'POST',
    body: JSON.stringify({
      action: 'reorder',
      storeId,
      orderedIds,
    }),
  })
}

export async function removeStoreWarehouseLink(
  getToken: TokenGetter,
  id: string
): Promise<void> {
  await authorizedRequest(getToken, `${BASE}?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}
