import { authorizedRequest, type TokenGetter } from '@/lib/authorized-request'
import {
  brandInputSchema,
  brandListResponseSchema,
  type BrandInput,
  type BrandListItem,
} from './schema'

const BASE = '/api/inventory/brands'

export async function fetchBrands(
  getToken: TokenGetter
): Promise<BrandListItem[]> {
  const payload = await authorizedRequest(getToken, BASE)
  return brandListResponseSchema.parse(payload).data
}

export async function createBrand(
  getToken: TokenGetter,
  input: BrandInput
): Promise<void> {
  const body = brandInputSchema.parse(input)
  await authorizedRequest(getToken, BASE, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function updateBrand(
  getToken: TokenGetter,
  id: string,
  input: Partial<BrandInput>
): Promise<void> {
  await authorizedRequest(getToken, `${BASE}?id=${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export async function deleteBrand(
  getToken: TokenGetter,
  id: string
): Promise<void> {
  await authorizedRequest(getToken, `${BASE}?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}
