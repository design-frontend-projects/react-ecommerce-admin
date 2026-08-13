import { Temporal, toPlainDate } from '@/lib/temporal_utils'
import prisma from '@/lib/prisma'

export function determineSegment(customer: any, sales: any[]): string {
  const today = Temporal.Now.plainDateISO()
  const thirtyDaysAgo = today.subtract({ days: 30 })
  const sixMonthsAgo = today.subtract({ months: 6 })

  const segment = 'active' // Default

  // If no activity in 6 months, inactive
  if (
    customer.last_active_at &&
    Temporal.PlainDate.compare(toPlainDate(customer.last_active_at), sixMonthsAgo) < 0
  ) {
    return 'inactive'
  }

  const recentSales = sales.filter(
    (s) =>
      (s.invoice_date || s.sale_date) &&
      Temporal.PlainDate.compare(toPlainDate(s.invoice_date || s.sale_date), thirtyDaysAgo) >= 0
  )

  if (recentSales.length > 0) {
    const totalSpend = recentSales.reduce(
      (sum, sale) => sum + Number(sale.total_amount || 0),
      0
    )

    if (totalSpend > 500) {
      return 'VIP'
    }

    if (recentSales.length >= 3) {
      return 'frequent'
    }
  }

  if (
    customer.created_at &&
    Temporal.PlainDate.compare(toPlainDate(customer.created_at), thirtyDaysAgo) >= 0
  ) {
    return 'new'
  }

  return segment
}

export async function classifySegments() {
  const customers = await prisma.customers.findMany({
    include: {
      sales_invoices: true,
    },
  })

  const updates = customers.map((customer: any) => {
    const segment = determineSegment(customer, customer.sales_invoices || [])
    return {
      id: customer.id,
      segment,
    }
  })

  // Batch update
  const updatePromises = updates.map((u: any) =>
    prisma.customers.update({
      where: { customer_id: u.customer_id },
      data: { crm_status: u.segment },
    })
  )

  await Promise.all(updatePromises)

  return updates
}
