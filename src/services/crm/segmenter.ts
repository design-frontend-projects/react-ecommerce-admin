import { Temporal, toPlainDate } from '@/lib/temporal_utils'
import prisma from '@/lib/prisma'

export function determineSegment(customer: any, sales: any[]): string {
  const today = Temporal.Now.plainDateISO()
  const thirtyDaysAgo = today.subtract({ days: 30 })
  const sixMonthsAgo = today.subtract({ months: 6 })

  const segment = 'active' // Default

  // If no activity in 6 months, inactive
  if (
    customer.updated_at &&
    Temporal.PlainDate.compare(toPlainDate(customer.updated_at), sixMonthsAgo) < 0
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

export async function classifySegments(tenantId?: string) {
  const customers = await prisma.customers.findMany({
    where: tenantId ? { tenant_id: tenantId } : undefined,
  })

  const updates = customers.map((customer: any) => {
    const segment = determineSegment(customer, [])
    return {
      id: customer.id,
      segment,
    }
  })

  // Batch update
  const updatePromises = updates.map((u: any) =>
    prisma.customers.update({
      where: { id: u.id },
      data: { is_active: u.segment !== 'inactive' },
    })
  )

  await Promise.all(updatePromises)

  return updates
}
