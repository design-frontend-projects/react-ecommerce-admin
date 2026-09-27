import { authorizedRequest, type TokenGetter } from '@/lib/authorized-request'
import {
  createReceiptInputSchema,
  poReceivingDetailsResponseSchema,
  receiptDetailResponseSchema,
  receiptListResponseSchema,
  searchReceivablePOsResponseSchema,
  type CreateReceiptInput,
  type PoReceivingDetails,
  type ReceiptDetail,
  type ReceiptListItem,
  type ReceivablePoSummaryItem,
} from './schema'

const BASE = '/api/inventory/goods-receipts'

export async function fetchReceipts(
  getToken: TokenGetter
): Promise<ReceiptListItem[]> {
  const payload = await authorizedRequest(getToken, BASE)
  return receiptListResponseSchema.parse(payload).data
}

export async function fetchReceipt(
  getToken: TokenGetter,
  id: string
): Promise<ReceiptDetail> {
  const payload = await authorizedRequest(
    getToken,
    `${BASE}?id=${encodeURIComponent(id)}`
  )
  return receiptDetailResponseSchema.parse(payload).data
}

export async function searchReceivablePurchaseOrders(
  getToken: TokenGetter,
  params: {
    query?: string
    supplierId?: string
    warehouseId?: string
    status?: string
    page?: number
    limit?: number
  } = {}
): Promise<{
  items: ReceivablePoSummaryItem[]
  pagination: { total: number; page: number; limit: number; totalPages: number }
}> {
  const q = new URLSearchParams()
  if (params.query) q.set('query', params.query)
  if (params.supplierId) q.set('supplierId', params.supplierId)
  if (params.warehouseId) q.set('warehouseId', params.warehouseId)
  if (params.status) q.set('status', params.status)
  if (params.page) q.set('page', String(params.page))
  if (params.limit) q.set('limit', String(params.limit))

  const payload = await authorizedRequest(
    getToken,
    `${BASE}/receivable-pos?${q.toString()}`
  )
  return searchReceivablePOsResponseSchema.parse(payload).data
}

export async function fetchPoReceivingDetails(
  getToken: TokenGetter,
  poId: string
): Promise<PoReceivingDetails> {
  const payload = await authorizedRequest(
    getToken,
    `${BASE}/receivable-pos?poId=${encodeURIComponent(poId)}`
  )
  return poReceivingDetailsResponseSchema.parse(payload).data
}

export async function createReceipt(
  getToken: TokenGetter,
  input: CreateReceiptInput
): Promise<ReceiptDetail> {
  const body = createReceiptInputSchema.parse(input)
  const payload = await authorizedRequest(getToken, BASE, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return receiptDetailResponseSchema.parse(payload).data
}

export async function cancelReceipt(
  getToken: TokenGetter,
  id: string
): Promise<void> {
  await authorizedRequest(getToken, `${BASE}?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export async function postReceipt(
  getToken: TokenGetter,
  id: string
): Promise<void> {
  await authorizedRequest(getToken, `${BASE}/post`, {
    method: 'POST',
    body: JSON.stringify({ id }),
  })
}

export async function fetchWarehouseLocations(
  getToken: TokenGetter,
  warehouseId: string
): Promise<Array<{ id: string; code: string; name: string | null; path: string | null }>> {
  const payload = (await authorizedRequest(
    getToken,
    `/api/inventory/warehouses/locations?warehouseId=${encodeURIComponent(warehouseId)}`
  )) as { success?: boolean; data?: Array<{ id: string; code: string; name: string | null; path: string | null }> }
  return payload?.data || []
}
