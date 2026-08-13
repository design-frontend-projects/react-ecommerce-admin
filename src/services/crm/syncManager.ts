import { Temporal } from '@js-temporal/polyfill'
import prisma from '@/lib/prisma'

export interface SyncPayload {
  orderId: string | number
  customer: {
    firstName: string
    lastName: string
    email?: string | null
    phone?: string | null
  }
  transactionAmount: number
}

/**
 * Synchronizes POS checkout transaction data to the CRM module.
 * Creates a new customer profile or updates an existing one based on email or phone.
 * Links the resulting customer to the POS sale record.
 */
export async function syncTransactionToCRM(payload: SyncPayload) {
  const { orderId, customer } = payload

  // Try to find an existing customer by email or phone
  let existingCustomer = null

  if (customer.email || customer.phone) {
    existingCustomer = await prisma.customers.findFirst({
      where: {
        OR: [
          ...(customer.email ? [{ email: customer.email }] : []),
          ...(customer.phone ? [{ phone: customer.phone }] : []),
        ],
      },
    })
  }

  let customerRecord

  if (existingCustomer) {
    // Update existing customer
    customerRecord = await prisma.customers.update({
      where: { id: existingCustomer.id },
      data: {
        first_name: customer.firstName || existingCustomer.first_name,
        last_name: customer.lastName || existingCustomer.last_name,
        phone: customer.phone || existingCustomer.phone,
        last_active_at: new Date(Temporal.Now.instant().epochMilliseconds),
      },
    })
  } else {
    // Create new customer
    customerRecord = await prisma.customers.create({
      data: {
        first_name: customer.firstName,
        last_name: customer.lastName,
        email: customer.email,
        phone: customer.phone,
        last_active_at: new Date(Temporal.Now.instant().epochMilliseconds),
      },
    })
  }

  // Link the sale invoice to the customer
  await prisma.sales_invoices.update({
    where: { id: String(orderId) },
    data: { customer_id: customerRecord.id },
  })

  return customerRecord
}
