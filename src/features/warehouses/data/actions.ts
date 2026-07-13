import { authorizedRequest, type TokenGetter } from '@/lib/authorized-request'
import {
  locationListResponseSchema,
  warehouseInputSchema,
  warehouseListResponseSchema,
  type LocationInput,
  type WarehouseInput,
  type WarehouseListItem,
  type WarehouseLocation,
} from './schema'

const BASE = '/api/inventory/warehouses'

export async function fetchWarehouses(
  getToken: TokenGetter
): Promise<WarehouseListItem[]> {
  const payload = await authorizedRequest(getToken, BASE)
  return warehouseListResponseSchema.parse(payload).data
}

export async function createWarehouse(
  getToken: TokenGetter,
  input: WarehouseInput
): Promise<void> {
  const body = warehouseInputSchema.parse(input)
  await authorizedRequest(getToken, BASE, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function updateWarehouse(
  getToken: TokenGetter,
  id: string,
  input: Partial<WarehouseInput>
): Promise<void> {
  await authorizedRequest(getToken, `${BASE}?id=${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export async function deleteWarehouse(
  getToken: TokenGetter,
  id: string
): Promise<void> {
  await authorizedRequest(getToken, `${BASE}?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export async function fetchLocations(
  getToken: TokenGetter,
  warehouseId: string
): Promise<WarehouseLocation[]> {
  const payload = await authorizedRequest(
    getToken,
    `${BASE}/locations?warehouseId=${encodeURIComponent(warehouseId)}`
  )
  return locationListResponseSchema.parse(payload).data
}

export async function createLocation(
  getToken: TokenGetter,
  warehouseId: string,
  input: LocationInput
): Promise<void> {
  await authorizedRequest(getToken, `${BASE}/locations`, {
    method: 'POST',
    body: JSON.stringify({ ...input, warehouseId }),
  })
}

export async function deleteLocation(
  getToken: TokenGetter,
  id: string
): Promise<void> {
  await authorizedRequest(
    getToken,
    `${BASE}/locations?id=${encodeURIComponent(id)}`,
    { method: 'DELETE' }
  )
}
