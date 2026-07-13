import { authorizedRequest, type TokenGetter } from '@/lib/authorized-request'
import {
  batchListResponseSchema,
  expireSweepResponseSchema,
  type BatchListItem,
  type BatchToggleStatus,
  type ExpireSweepResult,
} from './schema'

const BASE = '/api/inventory/batches'

export async function fetchBatches(
  getToken: TokenGetter
): Promise<BatchListItem[]> {
  const payload = await authorizedRequest(getToken, BASE)
  return batchListResponseSchema.parse(payload).data
}

export async function setBatchStatus(
  getToken: TokenGetter,
  id: string,
  status: BatchToggleStatus
): Promise<void> {
  await authorizedRequest(getToken, BASE, {
    method: 'POST',
    body: JSON.stringify({ id, status }),
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
