import { createFileRoute } from '@tanstack/react-router'
import {
  createInventoryTransaction,
  getInventoryTransactionById,
  listInventoryTransactions,
  type CreateInventoryTransactionInput,
  type ListTransactionsFilters,
} from '@/server/fns/inventory-transaction-engine'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'
import type { inventory_transaction_status_enum } from '@/generated/prisma/enums'

const GET = withAuth(PERMISSIONS.INVENTORY_VIEW, async ({ request, auth }) => {
  try {
    const { userId } = auth
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (id) {
      const data = await getInventoryTransactionById(userId, id)
      return Response.json({ success: true, data })
    }

    const filters: ListTransactionsFilters = {
      status: (searchParams.get('status') as inventory_transaction_status_enum) || undefined,
      typeCode: searchParams.get('typeCode') || undefined,
      sourceWarehouseId: searchParams.get('sourceWarehouseId') || undefined,
      destWarehouseId: searchParams.get('destWarehouseId') || undefined,
      referenceType: searchParams.get('referenceType') || undefined,
      referenceId: searchParams.get('referenceId') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      search: searchParams.get('search') || undefined,
      page: searchParams.get('page') ? Number(searchParams.get('page')) : 1,
      pageSize: searchParams.get('pageSize') ? Number(searchParams.get('pageSize')) : 20,
    }

    const data = await listInventoryTransactions(userId, filters)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to fetch inventory transactions')
  }
})

const POST = withAuth(PERMISSIONS.INVENTORY_MANAGE, async ({ request, auth }) => {
  try {
    const { userId } = auth
    const body = (await request.json()) as CreateInventoryTransactionInput
    const data = await createInventoryTransaction(userId, body)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to create inventory transaction')
  }
})

export const Route = createFileRoute('/api/inventory/transactions')({
  server: {
    handlers: {
      GET,
      POST,
    },
  },
})
