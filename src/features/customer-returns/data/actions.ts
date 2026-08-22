import { authorizedRequest, type TokenGetter } from '@/lib/authorized-request'
import {
  customerReturnsResponseSchema,
  type CreateCustomerReturnInput,
  type CustomerReturnListItem,
} from './schema'

const BASE = '/api/inventory/customer-returns'

export async function fetchCustomerReturns(
  getToken: TokenGetter
): Promise<CustomerReturnListItem[]> {
  const payload = await authorizedRequest(getToken, BASE)
  return customerReturnsResponseSchema.parse(payload).data
}

export async function createCustomerReturnAction(
  getToken: TokenGetter,
  input: CreateCustomerReturnInput
) {
  return authorizedRequest(getToken, BASE, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function receiveCustomerReturnAction(
  getToken: TokenGetter,
  id: string
) {
  return authorizedRequest(getToken, `${BASE}/receive`, {
    method: 'POST',
    body: JSON.stringify({ id }),
  })
}
