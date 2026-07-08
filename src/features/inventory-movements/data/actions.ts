import { authorizedRequest, type TokenGetter } from '@/lib/authorized-request'
import {
  movementsResponseSchema,
  type MovementFilters,
  type MovementRow,
} from './schema'

const BASE = '/api/inventory/movements'

export async function fetchMovements(
  getToken: TokenGetter,
  filters: MovementFilters = {}
): Promise<MovementRow[]> {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value))
    }
  }
  const query = params.toString()
  const payload = await authorizedRequest(
    getToken,
    query ? `${BASE}?${query}` : BASE
  )
  return movementsResponseSchema.parse(payload).data
}
