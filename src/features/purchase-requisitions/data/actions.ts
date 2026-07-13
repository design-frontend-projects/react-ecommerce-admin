import { authorizedRequest, type TokenGetter } from '@/lib/authorized-request'
import {
  createRequisitionInputSchema,
  requisitionDetailResponseSchema,
  requisitionListResponseSchema,
  type CreateRequisitionInput,
  type RequisitionAction,
  type RequisitionDetail,
  type RequisitionListItem,
} from './schema'

const BASE = '/api/inventory/purchase-requisitions'

export async function fetchRequisitions(
  getToken: TokenGetter
): Promise<RequisitionListItem[]> {
  const payload = await authorizedRequest(getToken, BASE)
  return requisitionListResponseSchema.parse(payload).data
}

export async function fetchRequisition(
  getToken: TokenGetter,
  id: string
): Promise<RequisitionDetail> {
  const payload = await authorizedRequest(
    getToken,
    `${BASE}?id=${encodeURIComponent(id)}`
  )
  return requisitionDetailResponseSchema.parse(payload).data
}

export async function createRequisition(
  getToken: TokenGetter,
  input: CreateRequisitionInput
): Promise<void> {
  const body = createRequisitionInputSchema.parse(input)
  await authorizedRequest(getToken, BASE, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function cancelRequisition(
  getToken: TokenGetter,
  id: string
): Promise<void> {
  await authorizedRequest(getToken, `${BASE}?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export async function actionRequisition(
  getToken: TokenGetter,
  id: string,
  action: RequisitionAction
): Promise<void> {
  await authorizedRequest(getToken, `${BASE}/actions`, {
    method: 'POST',
    body: JSON.stringify({ id, action }),
  })
}
