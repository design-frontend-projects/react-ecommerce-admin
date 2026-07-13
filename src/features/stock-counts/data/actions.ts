import { authorizedRequest, type TokenGetter } from '@/lib/authorized-request'
import {
  countDetailResponseSchema,
  countListResponseSchema,
  createCountInputSchema,
  type CountAction,
  type CountDetail,
  type CountEntryInput,
  type CountListItem,
  type CreateCountInput,
} from './schema'

const BASE = '/api/inventory/stock-counts'

export async function fetchCounts(
  getToken: TokenGetter
): Promise<CountListItem[]> {
  const payload = await authorizedRequest(getToken, BASE)
  return countListResponseSchema.parse(payload).data
}

export async function fetchCount(
  getToken: TokenGetter,
  id: string
): Promise<CountDetail> {
  const payload = await authorizedRequest(
    getToken,
    `${BASE}?id=${encodeURIComponent(id)}`
  )
  return countDetailResponseSchema.parse(payload).data
}

export async function createCount(
  getToken: TokenGetter,
  input: CreateCountInput
): Promise<void> {
  const body = createCountInputSchema.parse(input)
  await authorizedRequest(getToken, BASE, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function cancelCount(
  getToken: TokenGetter,
  id: string
): Promise<void> {
  await authorizedRequest(getToken, `${BASE}?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export async function runCountAction(
  getToken: TokenGetter,
  id: string,
  action: CountAction,
  entries?: CountEntryInput[]
): Promise<void> {
  await authorizedRequest(getToken, `${BASE}/actions`, {
    method: 'POST',
    body: JSON.stringify({ id, action, entries }),
  })
}
