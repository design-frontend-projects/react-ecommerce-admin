import { authorizedRequest, type TokenGetter } from '@/lib/authorized-request'
import {
  batchListResponseSchema,
  expireSweepResponseSchema,
  type BatchListItem,
  type BatchToggleStatus,
  type CreateBatchInput,
  type ExpireSweepResult,
  type UpdateBatchInput,
} from './schema'

const BASE = '/api/inventory/batches'

export async function fetchBatches(
  getToken: TokenGetter
): Promise<BatchListItem[]> {
  const payload = await authorizedRequest(getToken, BASE)
  return batchListResponseSchema.parse(payload).data
}

export async function createBatch(
  getToken: TokenGetter,
  input: CreateBatchInput
): Promise<void> {
  await authorizedRequest(getToken, BASE, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function updateBatch(
  getToken: TokenGetter,
  id: string,
  input: UpdateBatchInput
): Promise<void> {
  await authorizedRequest(getToken, `${BASE}?id=${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export async function deleteBatch(
  getToken: TokenGetter,
  id: string
): Promise<void> {
  await authorizedRequest(getToken, `${BASE}?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export async function setBatchStatus(
  getToken: TokenGetter,
  id: string,
  status: BatchToggleStatus
): Promise<void> {
  await authorizedRequest(getToken, BASE, {
    method: 'POST',
    body: JSON.stringify({ action: 'status', id, status }),
  })
}

export async function runExpirySweep(
  getToken: TokenGetter
): Promise<ExpireSweepResult> {
  const payload = await authorizedRequest(getToken, `${BASE}/expire`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
  return expireSweepResponseSchema.parse(payload).data
}
