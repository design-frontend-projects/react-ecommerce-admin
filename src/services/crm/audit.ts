import { Temporal } from '@js-temporal/polyfill'

export function logCustomerAccess(
  userId: string,
  role: string,
  customerId: number
) {
  const timestamp = Temporal.Now.instant().toString()
  console.log(
    `[AUDIT] ${timestamp} | User ${userId} (${role}) | Action: VIEW_PII | Target: Customer ${customerId}`
  )
}
