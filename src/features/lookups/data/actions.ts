import { authorizedRequest, type TokenGetter } from '@/lib/authorized-request'
import {
  lookupTypeListResponseSchema,
  lookupValueListResponseSchema,
  type LookupTypeItem,
  type LookupValueItem,
  type LookupValueFormValues,
} from './schema'

const TYPES_BASE = '/api/lookups/types'
const VALUES_BASE = '/api/lookups/values'

export async function fetchLookupTypes(
  getToken: TokenGetter
): Promise<LookupTypeItem[]> {
  const payload = await authorizedRequest(getToken, TYPES_BASE)
  return lookupTypeListResponseSchema.parse(payload).data
}

export async function fetchLookupValues(
  getToken: TokenGetter,
  typeCode: string,
  includeInactive = true
): Promise<{
  lookupType: {
    id: string
    code: string
    name: string
    description?: string | null
    is_system: boolean
  }
  values: LookupValueItem[]
}> {
  const url = `${VALUES_BASE}?type=${encodeURIComponent(typeCode)}&includeInactive=${includeInactive}`
  const payload = await authorizedRequest(getToken, url)
  return lookupValueListResponseSchema.parse(payload).data
}

export async function createLookupValue(
  getToken: TokenGetter,
  typeCode: string,
  input: LookupValueFormValues
): Promise<void> {
  const url = `${VALUES_BASE}?type=${encodeURIComponent(typeCode)}`
  await authorizedRequest(getToken, url, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function updateLookupValue(
  getToken: TokenGetter,
  id: string,
  input: Partial<LookupValueFormValues>
): Promise<void> {
  const url = `${VALUES_BASE}?id=${encodeURIComponent(id)}`
  await authorizedRequest(getToken, url, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export async function toggleLookupValue(
  getToken: TokenGetter,
  id: string
): Promise<void> {
  const url = `${VALUES_BASE}?id=${encodeURIComponent(id)}&action=toggle`
  await authorizedRequest(getToken, url, {
    method: 'PATCH',
  })
}

export async function deleteLookupValue(
  getToken: TokenGetter,
  id: string
): Promise<void> {
  const url = `${VALUES_BASE}?id=${encodeURIComponent(id)}`
  await authorizedRequest(getToken, url, {
    method: 'DELETE',
  })
}

export async function reorderLookupValues(
  getToken: TokenGetter,
  typeCode: string,
  orderedIds: string[]
): Promise<void> {
  const url = `${VALUES_BASE}?type=${encodeURIComponent(typeCode)}&action=reorder`
  await authorizedRequest(getToken, url, {
    method: 'PUT',
    body: JSON.stringify({ orderedIds }),
  })
}
