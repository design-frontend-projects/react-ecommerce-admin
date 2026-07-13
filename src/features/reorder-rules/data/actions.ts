import { authorizedRequest, type TokenGetter } from '@/lib/authorized-request'
import {
  ruleInputSchema,
  ruleListResponseSchema,
  type RuleInput,
  type RuleListItem,
} from './schema'

const BASE = '/api/inventory/reorder-rules'

export async function fetchRules(
  getToken: TokenGetter
): Promise<RuleListItem[]> {
  const payload = await authorizedRequest(getToken, BASE)
  return ruleListResponseSchema.parse(payload).data
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
