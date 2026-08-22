import { authorizedRequest, type TokenGetter } from '@/lib/authorized-request'
import {
  categoryInputSchema,
  categoryListResponseSchema,
  type CategoryInput,
  type CategoryListItem,
} from './schema'

const BASE = '/api/inventory/categories'

export async function fetchCategories(
  getToken: TokenGetter
): Promise<CategoryListItem[]> {
  const payload = await authorizedRequest(getToken, BASE)
  return categoryListResponseSchema.parse(payload).data
}

export async function createCategory(
  getToken: TokenGetter,
  input: CategoryInput
): Promise<void> {
  const body = categoryInputSchema.parse(input)
  await authorizedRequest(getToken, BASE, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function updateCategory(
  getToken: TokenGetter,
  id: string,
  input: Partial<CategoryInput>
): Promise<void> {
  await authorizedRequest(getToken, `${BASE}?id=${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export async function deleteCategory(
  getToken: TokenGetter,
  id: string
): Promise<void> {
  await authorizedRequest(getToken, `${BASE}?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}
