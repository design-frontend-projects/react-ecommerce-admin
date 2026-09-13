import { authorizedRequest, type TokenGetter } from '@/lib/authorized-request'
import {
  listTransactionsResponseSchema,
  transactionDetailResponseSchema,
  createTransactionInputSchema,
  type CreateTransactionInput,
  type TransactionDetail,
  type TransactionListItem,
} from './schema'

const BASE = '/api/inventory/transactions'

export interface FetchTransactionsParams {
  status?: string
  typeCode?: string
  sourceWarehouseId?: string
  destWarehouseId?: string
  search?: string
  page?: number
  pageSize?: number
}

export async function fetchInventoryTransactions(
  getToken: TokenGetter,
  params: FetchTransactionsParams = {}
): Promise<{
  items: TransactionListItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}> {
  const query = new URLSearchParams()
  if (params.status && params.status !== '__all__') query.set('status', params.status)
  if (params.typeCode && params.typeCode !== '__all__') query.set('typeCode', params.typeCode)
  if (params.sourceWarehouseId && params.sourceWarehouseId !== '__all__') {
    query.set('sourceWarehouseId', params.sourceWarehouseId)
  }
  if (params.destWarehouseId && params.destWarehouseId !== '__all__') {
    query.set('destWarehouseId', params.destWarehouseId)
  }
  if (params.search) query.set('search', params.search)
  if (params.page) query.set('page', String(params.page))
  if (params.pageSize) query.set('pageSize', String(params.pageSize))

  const url = query.toString() ? `${BASE}?${query.toString()}` : BASE
  const payload = await authorizedRequest(getToken, url)
  return listTransactionsResponseSchema.parse(payload).data
}

export async function fetchInventoryTransaction(
  getToken: TokenGetter,
  id: string
): Promise<TransactionDetail> {
  const payload = await authorizedRequest(getToken, `${BASE}?id=${encodeURIComponent(id)}`)
  return transactionDetailResponseSchema.parse(payload).data
}

export async function createInventoryTransactionAction(
  getToken: TokenGetter,
  input: CreateTransactionInput
): Promise<void> {
  const body = createTransactionInputSchema.parse(input)
  await authorizedRequest(getToken, BASE, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function postInventoryTransactionAction(
  getToken: TokenGetter,
  id: string
): Promise<void> {
  await authorizedRequest(getToken, `${BASE}/post`, {
    method: 'POST',
    body: JSON.stringify({ id }),
  })
}

export async function cancelInventoryTransactionAction(
  getToken: TokenGetter,
  id: string,
  reason?: string
): Promise<void> {
  await authorizedRequest(getToken, `${BASE}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ id, reason }),
  })
}

export async function reverseInventoryTransactionAction(
  getToken: TokenGetter,
  id: string,
  reason: string
): Promise<void> {
  await authorizedRequest(getToken, `${BASE}/reverse`, {
    method: 'POST',
    body: JSON.stringify({ id, reason }),
  })
}
