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
  const parsed = supplierInputSchema.parse(input)
  const resolvedIsActive = parsed.isActive ?? parsed.is_active ?? true
  const resolvedIsPreferred = parsed.isPreferred ?? parsed.is_preferred ?? false
  const body = {
    ...parsed,
    contactPerson: parsed.contactPerson ?? parsed.contact_person ?? null,
    taxNumber: parsed.taxNumber ?? parsed.tax_number ?? null,
    paymentTermsDays: parsed.paymentTermsDays ?? parsed.payment_terms_days ?? 0,
    isActive: resolvedIsActive,
    isPreferred: resolvedIsPreferred,
    contact_person: parsed.contact_person ?? parsed.contactPerson ?? null,
    tax_number: parsed.tax_number ?? parsed.taxNumber ?? null,
    payment_terms_days: parsed.payment_terms_days ?? parsed.paymentTermsDays ?? 0,
    is_active: resolvedIsActive,
    is_preferred: resolvedIsPreferred,
  }
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
  const resolvedIsActive = input.isActive ?? input.is_active
  const resolvedIsPreferred = input.isPreferred ?? input.is_preferred
  const body = {
    ...input,
    contactPerson: input.contactPerson ?? input.contact_person,
    taxNumber: input.taxNumber ?? input.tax_number,
    paymentTermsDays: input.paymentTermsDays ?? input.payment_terms_days,
    isActive: resolvedIsActive,
    isPreferred: resolvedIsPreferred,
    contact_person: input.contact_person ?? input.contactPerson,
    tax_number: input.tax_number ?? input.taxNumber,
    payment_terms_days: input.payment_terms_days ?? input.paymentTermsDays,
    is_active: resolvedIsActive,
    is_preferred: resolvedIsPreferred,
  }
  await authorizedRequest(getToken, `${BASE}?id=${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
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
