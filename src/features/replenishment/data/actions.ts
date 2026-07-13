import { authorizedRequest, type TokenGetter } from '@/lib/authorized-request'
import {
  convertResponseSchema,
  runCheckResponseSchema,
  suggestionListResponseSchema,
  type ConvertResult,
  type RunCheckResult,
  type SuggestionListItem,
} from './schema'

const BASE = '/api/inventory/reorder-suggestions'

export async function fetchSuggestions(
  getToken: TokenGetter
): Promise<SuggestionListItem[]> {
  const payload = await authorizedRequest(getToken, BASE)
  return suggestionListResponseSchema.parse(payload).data
}

export async function runReorderCheck(
  getToken: TokenGetter,
  storeId?: string
): Promise<RunCheckResult> {
  const payload = await authorizedRequest(getToken, `${BASE}/run`, {
    method: 'POST',
    body: JSON.stringify(storeId ? { storeId } : {}),
  })
  return runCheckResponseSchema.parse(payload).data
}

export async function convertSuggestions(
  getToken: TokenGetter,
  ids: string[]
): Promise<ConvertResult> {
  const payload = await authorizedRequest(getToken, `${BASE}/convert`, {
    method: 'POST',
    body: JSON.stringify({ ids }),
  })
  return convertResponseSchema.parse(payload).data
}

export async function dismissSuggestion(
  getToken: TokenGetter,
  id: string
): Promise<void> {
  await authorizedRequest(getToken, `${BASE}?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}
