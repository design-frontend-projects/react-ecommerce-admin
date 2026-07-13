import { authorizedRequest, type TokenGetter } from '@/lib/authorized-request'
import {
  createReceiptInputSchema,
  receiptDetailResponseSchema,
  receiptListResponseSchema,
  type CreateReceiptInput,
  type ReceiptDetail,
  type ReceiptListItem,
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

export async function createReceipt(
  getToken: TokenGetter,
  input: CreateReceiptInput
): Promise<void> {
  const body = createReceiptInputSchema.parse(input)
  await authorizedRequest(getToken, BASE, {
    method: 'POST',
    body: JSON.stringify(body),
  })
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
