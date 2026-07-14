export function logCustomerAccess(
  userId: string,
  role: string,
  customerId: number
) {
  const timestamp = new Date().toISOString()
  console.log(
    `[AUDIT] ${timestamp} | User ${userId} (${role}) | Action: VIEW_PII | Target: Customer ${customerId}`
  )
}
