import { createFileRoute } from '@tanstack/react-router'
import {
  createFinancialTransaction,
  getFinancialTransaction,
  getFinancialTransactionStats,
  listFinancialTransactions,
  type CreateFinancialTransactionInput,
  type ListFinancialTransactionsParams,
} from '@/server/fns/financial-transactions'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'
import type { financial_transaction_type_enum } from '@/generated/prisma/enums'

const GET = withAuth(PERMISSIONS.INVENTORY_VIEW, async ({ request, auth }) => {
  try {
    const { userId } = auth
    const { searchParams } = new URL(request.url)

    const isStats = searchParams.get('stats') === 'true'
    if (isStats) {
      const stats = await getFinancialTransactionStats(userId)
      return Response.json({ success: true, data: stats })
    }

    const id = searchParams.get('id')
    if (id) {
      const data = await getFinancialTransaction(userId, id)
      return Response.json({ success: true, data })
    }

    const filters: ListFinancialTransactionsParams = {
      type: (searchParams.get('type') as financial_transaction_type_enum) || undefined,
      status: searchParams.get('status') || undefined,
      currency: searchParams.get('currency') || undefined,
      search: searchParams.get('search') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      salesInvoiceId: searchParams.get('salesInvoiceId') || undefined,
      salesReturnId: searchParams.get('salesReturnId') || undefined,
      referenceTransactionId: searchParams.get('referenceTransactionId') || undefined,
      page: searchParams.get('page') ? Number(searchParams.get('page')) : 1,
      pageSize: searchParams.get('pageSize') ? Number(searchParams.get('pageSize')) : 20,
    }

    const data = await listFinancialTransactions(userId, filters)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to fetch financial transactions')
  }
})

const POST = withAuth(PERMISSIONS.INVENTORY_MANAGE, async ({ request, auth }) => {
  try {
    const { userId } = auth
    const body = (await request.json()) as CreateFinancialTransactionInput
    const data = await createFinancialTransaction(userId, body)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to create financial transaction')
  }
})

export const Route = createFileRoute('/api/financial-transactions/')({
  server: {
    handlers: {
      GET,
      POST,
    },
  },
})
