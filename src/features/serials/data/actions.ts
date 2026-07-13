import { authorizedRequest, type TokenGetter } from '@/lib/authorized-request'
import {
  serialListResponseSchema,
  serialTrailResponseSchema,
  type SerialFilters,
  type SerialListItem,
  type SerialTrailEntry,
} from './schema'

const BASE = '/api/inventory/serials'

export async function fetchSerials(
  getToken: TokenGetter,
  filters: SerialFilters = {}
): Promise<SerialListItem[]> {
  const params = new URLSearchParams()
  if (filters.search) params.set('search', filters.search)
  if (filters.status) params.set('status', filters.status)
  const query = params.toString()
  const payload = await authorizedRequest(
    getToken,
    query ? `${BASE}?${query}` : BASE
  )
  return serialListResponseSchema.parse(payload).data
}

export async function fetchSerialTrail(
  getToken: TokenGetter,
  serialId: string
): Promise<SerialTrailEntry[]> {
  const payload = await authorizedRequest(
    getToken,
    `${BASE}?trail=${encodeURIComponent(serialId)}`
  )
  return serialTrailResponseSchema.parse(payload).data
}
