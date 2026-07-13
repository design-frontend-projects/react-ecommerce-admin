import { authorizedRequest, type TokenGetter } from '@/lib/authorized-request'
import {
  reservationListResponseSchema,
  type ReservationListItem,
} from './schema'

const BASE = '/api/inventory/reservations'

export async function fetchReservations(
  getToken: TokenGetter
): Promise<ReservationListItem[]> {
  const payload = await authorizedRequest(getToken, BASE)
  return reservationListResponseSchema.parse(payload).data
}

export async function releaseReservation(
  getToken: TokenGetter,
  id: string
): Promise<void> {
  await authorizedRequest(getToken, BASE, {
    method: 'POST',
    body: JSON.stringify({ id }),
  })
}
