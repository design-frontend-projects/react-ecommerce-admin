import { authorizedRequest, type TokenGetter } from '@/lib/authorized-request'
import {
  createTransferInputSchema,
  transferDetailResponseSchema,
  transferListResponseSchema,
  updateTransferInputSchema,
  type CreateTransferInput,
  type TransferDetail,
  type TransferListItem,
  type UpdateTransferInput,
} from './schema'

const BASE = '/api/inventory/transfers'

export async function fetchTransfers(
  getToken: TokenGetter
): Promise<TransferListItem[]> {
  const payload = await authorizedRequest(getToken, BASE)
  return transferListResponseSchema.parse(payload).data
}

export async function fetchTransfer(
  getToken: TokenGetter,
  id: string
): Promise<TransferDetail> {
  const payload = await authorizedRequest(
    getToken,
    `${BASE}?id=${encodeURIComponent(id)}`
  )
  return transferDetailResponseSchema.parse(payload).data
}

export async function createTransfer(
  getToken: TokenGetter,
  input: CreateTransferInput
): Promise<void> {
  const body = createTransferInputSchema.parse(input)
  await authorizedRequest(getToken, BASE, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function updateTransfer(
  getToken: TokenGetter,
  input: UpdateTransferInput
): Promise<void> {
  const body = updateTransferInputSchema.parse(input)
  await authorizedRequest(getToken, BASE, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function cancelTransfer(
  getToken: TokenGetter,
  id: string
): Promise<void> {
  await authorizedRequest(getToken, `${BASE}?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export async function applyTransfer(
  getToken: TokenGetter,
  id: string
): Promise<void> {
  await authorizedRequest(getToken, `${BASE}/apply`, {
    method: 'POST',
    body: JSON.stringify({ id }),
  })
}
