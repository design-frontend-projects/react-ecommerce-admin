import { authorizedRequest, type TokenGetter } from '@/lib/authorized-request'
import {
  salesShipmentsResponseSchema,
  type CreateShipmentInput,
  type SalesShipmentListItem,
} from './schema'

const BASE = '/api/inventory/sales-shipments'

export async function fetchSalesShipments(
  getToken: TokenGetter
): Promise<SalesShipmentListItem[]> {
  const payload = await authorizedRequest(getToken, BASE)
  return salesShipmentsResponseSchema.parse(payload).data
}

export async function createSalesShipmentAction(
  getToken: TokenGetter,
  input: CreateShipmentInput
) {
  return authorizedRequest(getToken, BASE, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function dispatchSalesShipmentAction(
  getToken: TokenGetter,
  id: string
) {
  return authorizedRequest(getToken, `${BASE}/ship`, {
    method: 'POST',
    body: JSON.stringify({ id }),
  })
}
