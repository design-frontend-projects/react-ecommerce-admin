import { authorizedRequest, type TokenGetter } from '@/lib/authorized-request'
import {
  ruleInputSchema,
  paginatedReorderRulesResponseSchema,
  type PaginatedReorderRulesData,
  type ReorderRulesQueryParams,
  type RuleInput,
} from './schema'

const BASE = '/api/inventory/reorder-rules'

export async function fetchRules(
  getToken: TokenGetter,
  params: Partial<ReorderRulesQueryParams> = {}
): Promise<PaginatedReorderRulesData> {
  const query = new URLSearchParams()
  if (params.page !== undefined) query.set('page', String(params.page))
  if (params.pageSize !== undefined)
    query.set('pageSize', String(params.pageSize))
  if (params.search) query.set('search', params.search)
  if (params.storeId) query.set('storeId', params.storeId)
  if (params.isActive !== undefined)
    query.set('isActive', String(params.isActive))
  if (params.sortBy) query.set('sortBy', params.sortBy)
  if (params.sortOrder) query.set('sortOrder', params.sortOrder)

  const url = query.toString() ? `${BASE}?${query.toString()}` : BASE
  const payload = await authorizedRequest(getToken, url)
  return paginatedReorderRulesResponseSchema.parse(payload).data
}

export async function createRule(
  getToken: TokenGetter,
  input: RuleInput
): Promise<void> {
  const body = ruleInputSchema.parse(input)
  await authorizedRequest(getToken, BASE, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function updateRule(
  getToken: TokenGetter,
  id: string,
  input: Partial<RuleInput>
): Promise<void> {
  await authorizedRequest(getToken, `${BASE}?id=${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export async function deleteRule(
  getToken: TokenGetter,
  id: string
): Promise<void> {
  await authorizedRequest(getToken, `${BASE}?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}
