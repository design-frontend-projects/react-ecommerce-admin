'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'

interface GetInvoicesParams {
  page?: number
  limit?: number
  search?: string
  status?: string
  startDate?: Date | string
  endDate?: Date | string
}

export async function getInvoices(params: GetInvoicesParams = {}) {
  const { userId } = await auth()
  
  if (!userId) {
    throw new Error('Unauthorized')
  }

  const {
    page = 1,
    limit = 10,
    search = '',
    status,
    startDate,
    endDate,
  } = params

  const skip = (page - 1) * limit

  const whereCondition: Record<string, unknown> = {
    clerk_user_id: userId,
  }

  if (startDate || endDate) {
    whereCondition.invoice_date = {}
    if (startDate) {
      (whereCondition.invoice_date as Record<string, unknown>).gte = new Date(startDate)
    }
    if (endDate) {
      (whereCondition.invoice_date as Record<string, unknown>).lte = new Date(endDate)
    }
  }

  if (search) {
    whereCondition.invoice_no = {
      contains: search,
      mode: 'insensitive'
    }
  }

  if (status) {
    // Map status string to enum if valid
    whereCondition.status = status
  }

  try {
    const [invoices, total] = await Promise.all([
      prisma.sales_invoices.findMany({
        where: whereCondition,
        skip,
        take: limit,
        orderBy: { invoice_date: 'desc' },
        include: {
          sales_invoice_items: true,
          shipment: true,
        }
      }),
      prisma.sales_invoices.count({
        where: whereCondition,
      }),
    ])

    return {
      invoices,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  } catch (error: unknown) {
    // eslint-disable-next-line no-console
    console.error('Failed to fetch invoices:', error)
    throw new Error(error instanceof Error ? error.message : 'Database error')
  }
}
