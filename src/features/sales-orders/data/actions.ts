import { authorizedRequest, type TokenGetter } from '@/lib/authorized-request'
import {
  createOrderInputSchema,
  orderDetailResponseSchema,
  orderListResponseSchema,
  type CreateOrderInput,
  type OrderAction,
  type OrderDetail,
  type OrderListItem,
} from './schema'

const BASE = '/api/inventory/sales-orders'

export async function fetchOrders(
  getToken: TokenGetter
): Promise<OrderListItem[]> {
  const payload = await authorizedRequest(getToken, BASE)
  return orderListResponseSchema.parse(payload).data
}

export async function fetchOrder(
  getToken: TokenGetter,
  id: string
): Promise<OrderDetail> {
  const payload = await authorizedRequest(
    getToken,
    `${BASE}?id=${encodeURIComponent(id)}`
  )
  return orderDetailResponseSchema.parse(payload).data
}

export async function createOrder(
  getToken: TokenGetter,
  input: CreateOrderInput
): Promise<void> {
  const body = createOrderInputSchema.parse(input)
  await authorizedRequest(getToken, BASE, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function runOrderAction(
  getToken: TokenGetter,
  id: string,
  action: OrderAction
): Promise<void> {
  await authorizedRequest(getToken, `${BASE}/actions`, {
    method: 'POST',
    body: JSON.stringify({ id, action }),
  })
}
