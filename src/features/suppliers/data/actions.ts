import { authorizedRequest, type TokenGetter } from '@/lib/authorized-request'
import {
  supplierInputSchema,
  supplierListResponseSchema,
  type SupplierInput,
  type SupplierListItem,
} from './schema'

const BASE = '/api/inventory/suppliers'

export async function fetchSuppliers(
  getToken: TokenGetter
): Promise<SupplierListItem[]> {
  const payload = await authorizedRequest(getToken, BASE)
  const parsed = supplierListResponseSchema.parse(payload)
  return parsed.data.map((item) => ({
    ...item,
    supplier_id: item.id, // For backwards compatibility
  }))
}

export async function createSupplier(
  getToken: TokenGetter,
  input: SupplierInput
): Promise<void> {
  const body = supplierInputSchema.parse(input)
  await authorizedRequest(getToken, BASE, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function updateSupplier(
  getToken: TokenGetter,
  id: string,
  input: Partial<SupplierInput>
): Promise<void> {
  await authorizedRequest(getToken, `${BASE}?id=${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export async function deleteSupplier(
  getToken: TokenGetter,
  id: string
): Promise<void> {
  await authorizedRequest(getToken, `${BASE}?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}
