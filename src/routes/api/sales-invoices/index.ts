import { createFileRoute } from '@tanstack/react-router'
import {
  createSalesInvoice,
  getInvoiceById,
  listSalesInvoices,
  type CreateSalesInvoiceInput,
  type ListSalesInvoicesFilter,
} from '@/server/fns/sales-invoice-engine'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'
import type {
  invoice_status_enum,
  invoice_payment_status_enum,
  invoice_type_enum,
} from '@/generated/prisma/enums'

const GET = withAuth(PERMISSIONS.SALES_VIEW, async ({ request, auth }) => {
  try {
    const { userId } = auth
    const { searchParams } = new URL(request.url)

    const id = searchParams.get('id')?.trim()
    if (id && id !== 'undefined' && id !== 'null') {
      const data = await getInvoiceById(userId, id)
      return Response.json({ success: true, data })
    }

    const filters: ListSalesInvoicesFilter = {
      search: searchParams.get('search') || undefined,
      status: (searchParams.get('status') as invoice_status_enum | 'all') || undefined,
      paymentStatus: (searchParams.get('paymentStatus') as invoice_payment_status_enum | 'all') || undefined,
      invoiceType: (searchParams.get('invoiceType') as invoice_type_enum | 'all') || undefined,
      customerId: searchParams.get('customerId') || undefined,
      storeId: searchParams.get('storeId') || undefined,
      warehouseId: searchParams.get('warehouseId') || undefined,
      sourceType: searchParams.get('sourceType') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      page: searchParams.get('page') ? Number(searchParams.get('page')) : 1,
      pageSize: searchParams.get('pageSize') ? Number(searchParams.get('pageSize')) : 20,
      sortBy: (searchParams.get('sortBy') as any) || 'created_at',
      sortOrder: (searchParams.get('sortOrder') as any) || 'desc',
    }

    const data = await listSalesInvoices(userId, filters)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to fetch sales invoices')
  }
})

const POST = withAuth(PERMISSIONS.SALES_MANAGE, async ({ request, auth }) => {
  try {
    const { userId } = auth
    const body = (await request.json()) as CreateSalesInvoiceInput
    const data = await createSalesInvoice(userId, body)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to create sales invoice')
  }
})

export const Route = createFileRoute('/api/sales-invoices/')({
  server: {
    handlers: {
      GET,
      POST,
    },
  },
})
