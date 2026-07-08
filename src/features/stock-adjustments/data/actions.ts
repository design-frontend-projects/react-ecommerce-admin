import { authorizedRequest, type TokenGetter } from '@/lib/authorized-request'
import {
  adjustmentDetailResponseSchema,
  adjustmentListResponseSchema,
  createAdjustmentInputSchema,
  type AdjustmentDetail,
  type AdjustmentListItem,
  type CreateAdjustmentInput,
} from './schema'

const BASE = '/api/inventory/adjustments'

export async function fetchAdjustments(
  getToken: TokenGetter
): Promise<AdjustmentListItem[]> {
  const payload = await authorizedRequest(getToken, BASE)
  return adjustmentListResponseSchema.parse(payload).data
}

export async function fetchAdjustment(
  getToken: TokenGetter,
  id: string
): Promise<AdjustmentDetail> {
  const payload = await authorizedRequest(
    getToken,
    `${BASE}?id=${encodeURIComponent(id)}`
  )
  return adjustmentDetailResponseSchema.parse(payload).data
}

export async function createAdjustment(
  getToken: TokenGetter,
  input: CreateAdjustmentInput
): Promise<void> {
  const body = createAdjustmentInputSchema.parse(input)
  await authorizedRequest(getToken, BASE, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function cancelAdjustment(
  getToken: TokenGetter,
  id: string
): Promise<void> {
  await authorizedRequest(getToken, `${BASE}?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export async function applyAdjustment(
  getToken: TokenGetter,
  id: string
): Promise<void> {
  await authorizedRequest(getToken, `${BASE}/apply`, {
    method: 'POST',
    body: JSON.stringify({ id }),
  })
}
