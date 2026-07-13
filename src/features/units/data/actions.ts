import { authorizedRequest, type TokenGetter } from '@/lib/authorized-request'
import {
  conversionInputSchema,
  conversionListResponseSchema,
  uomInputSchema,
  uomListResponseSchema,
  type ConversionInput,
  type ConversionListItem,
  type UomInput,
  type UomListItem,
} from './schema'

const BASE = '/api/inventory/uoms'

export async function fetchUoms(getToken: TokenGetter): Promise<UomListItem[]> {
  const payload = await authorizedRequest(getToken, BASE)
  return uomListResponseSchema.parse(payload).data
}

export async function createUom(
  getToken: TokenGetter,
  input: UomInput
): Promise<void> {
  const body = uomInputSchema.parse(input)
  await authorizedRequest(getToken, BASE, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function updateUom(
  getToken: TokenGetter,
  id: string,
  input: Partial<UomInput>
): Promise<void> {
  await authorizedRequest(getToken, `${BASE}?id=${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export async function deleteUom(
  getToken: TokenGetter,
  id: string
): Promise<void> {
  await authorizedRequest(getToken, `${BASE}?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export async function fetchConversions(
  getToken: TokenGetter
): Promise<ConversionListItem[]> {
  const payload = await authorizedRequest(getToken, `${BASE}/conversions`)
  return conversionListResponseSchema.parse(payload).data
}

export async function createConversion(
  getToken: TokenGetter,
  input: ConversionInput
): Promise<void> {
  const body = conversionInputSchema.parse(input)
  await authorizedRequest(getToken, `${BASE}/conversions`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function deleteConversion(
  getToken: TokenGetter,
  id: string
): Promise<void> {
  await authorizedRequest(
    getToken,
    `${BASE}/conversions?id=${encodeURIComponent(id)}`,
    { method: 'DELETE' }
  )
}
