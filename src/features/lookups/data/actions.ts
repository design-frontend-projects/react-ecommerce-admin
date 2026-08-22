import { authorizedRequest, type TokenGetter } from '@/lib/authorized-request'
import {
  lookupTypeListResponseSchema,
  lookupValueListResponseSchema,
  lookupTreeResponseSchema,
  type LookupTypeItem,
  type LookupValueFormValues,
  type LookupTypeFormValues,
  type LookupTreeResponseData,
  type LookupValuesResponseData,
} from './schema'

const TYPES_BASE = '/api/lookups/types'
const VALUES_BASE = '/api/lookups/values'
const TREE_BASE = '/api/lookups/tree'

export async function fetchLookupTypes(
  getToken: TokenGetter
): Promise<LookupTypeItem[]> {
  const payload = await authorizedRequest(getToken, TYPES_BASE)
  return lookupTypeListResponseSchema.parse(payload).data
}

export async function fetchLookupTree(
  getToken: TokenGetter
): Promise<LookupTreeResponseData> {
  const payload = await authorizedRequest(getToken, TREE_BASE)
  return lookupTreeResponseSchema.parse(payload).data
}

export async function fetchLookupValues(
  getToken: TokenGetter,
  typeCode: string,
  includeInactive = true
): Promise<LookupValuesResponseData> {
  const url = `${VALUES_BASE}?type=${encodeURIComponent(typeCode)}&includeInactive=${includeInactive}`
  const payload = await authorizedRequest(getToken, url)
  return lookupValueListResponseSchema.parse(payload).data
}

export async function createLookupType(
  getToken: TokenGetter,
  input: LookupTypeFormValues
): Promise<void> {
  await authorizedRequest(getToken, TYPES_BASE, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function createLookupValue(
  getToken: TokenGetter,
  typeCode: string,
  input: LookupValueFormValues
): Promise<void> {
  let metadata: Record<string, unknown> = {}
  if (input.metadataJson && input.metadataJson.trim()) {
    try {
      metadata = JSON.parse(input.metadataJson)
    } catch {
      // ignore parse error if invalid
    }
  }

  const url = `${VALUES_BASE}?type=${encodeURIComponent(typeCode)}`
  await authorizedRequest(getToken, url, {
    method: 'POST',
    body: JSON.stringify({
      code: input.code,
      name: input.name,
      nameAr: input.nameAr,
      description: input.description,
      color: input.color,
      icon: input.icon,
      parentId: input.parentId,
      isDefault: input.isDefault,
      isActive: input.isActive,
      sortOrder: input.sortOrder,
      metadata,
    }),
  })
}

export async function updateLookupValue(
  getToken: TokenGetter,
  id: string,
  input: Partial<LookupValueFormValues>
): Promise<void> {
  let metadata: Record<string, unknown> | undefined = undefined
  if (input.metadataJson !== undefined) {
    if (input.metadataJson && input.metadataJson.trim()) {
      try {
        metadata = JSON.parse(input.metadataJson)
      } catch {
        // ignore
      }
    } else {
      metadata = {}
    }
  }

  const url = `${VALUES_BASE}?id=${encodeURIComponent(id)}`
  await authorizedRequest(getToken, url, {
    method: 'PATCH',
    body: JSON.stringify({
      code: input.code,
      name: input.name,
      nameAr: input.nameAr,
      description: input.description,
      color: input.color,
      icon: input.icon,
      parentId: input.parentId,
      isDefault: input.isDefault,
      isActive: input.isActive,
      sortOrder: input.sortOrder,
      ...(metadata !== undefined ? { metadata } : {}),
    }),
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
