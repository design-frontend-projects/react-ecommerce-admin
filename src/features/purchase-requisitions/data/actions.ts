import { authorizedRequest, type TokenGetter } from '@/lib/authorized-request'
import {
  createRequisitionInputSchema,
  updateRequisitionInputSchema,
  requisitionDetailResponseSchema,
  requisitionListResponseSchema,
  type CreateRequisitionInput,
  type UpdateRequisitionInput,
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

export async function updateRequisition(
  getToken: TokenGetter,
  id: string,
  input: UpdateRequisitionInput
): Promise<void> {
  const body = updateRequisitionInputSchema.parse(input)
  await authorizedRequest(getToken, `${BASE}?id=${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export async function deleteRequisition(
  getToken: TokenGetter,
  id: string
): Promise<void> {
  await authorizedRequest(
    getToken,
    `${BASE}?id=${encodeURIComponent(id)}&permanent=true`,
    {
      method: 'DELETE',
    }
  )
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
