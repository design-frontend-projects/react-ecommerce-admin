import { createServerFn } from '@tanstack/react-start'
import prisma from '@/lib/prisma'

export interface GetInvoicesParams {
  page?: number
  limit?: number
  search?: string
  status?: string
  startDate?: Date | string
  endDate?: Date | string
  tenantId?: string
}

export const getInvoices = createServerFn({ method: 'GET' })
  .validator((params: GetInvoicesParams = {}) => params)
  .handler(async ({ data: params }) => {
    const {
      page = 1,
      limit = 10,
      search = '',
      status,
      startDate,
      endDate,
      tenantId,
    } = params

    const skip = (page - 1) * limit

    const whereCondition: Record<string, unknown> = {}
    if (tenantId) {
      whereCondition.tenant_id = tenantId
    }

    if (startDate || endDate) {
      whereCondition.invoice_date = {}
      if (startDate) {
        ;(whereCondition.invoice_date as Record<string, unknown>).gte = new Date(
          startDate
        )
      }
      if (endDate) {
        ;(whereCondition.invoice_date as Record<string, unknown>).lte = new Date(
          endDate
        )
      }
    }

    if (search) {
      whereCondition.invoice_no = {
        contains: search,
        mode: 'insensitive',
      }
    }

    if (status) {
      whereCondition.status = status
    }

    try {
      const [invoices, total] = await Promise.all([
        prisma.sales_invoices.findMany({
          where: whereCondition,
          skip,
          take: limit,
          orderBy: { invoice_date: 'desc' },
        }),
        prisma.sales_invoices.count({
          where: whereCondition,
        }),
      ])

      const serializedInvoices = invoices.map((inv) => ({
        ...inv,
        subtotal: inv.subtotal ? Number(inv.subtotal) : 0,
        total_amount: inv.total_amount ? Number(inv.total_amount) : 0,
        discount_amount: inv.discount_amount ? Number(inv.discount_amount) : 0,
        tax_amount: inv.tax_amount ? Number(inv.tax_amount) : 0,
        paid_amount: inv.paid_amount ? Number(inv.paid_amount) : 0,
        discount_value: inv.discount_value ? Number(inv.discount_value) : null,
      }))

      return {
        invoices: serializedInvoices as any,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      }
    } catch (error: unknown) {
      console.error('Failed to fetch invoices:', error)
      throw new Error(error instanceof Error ? error.message : 'Database error')
    }
  })
