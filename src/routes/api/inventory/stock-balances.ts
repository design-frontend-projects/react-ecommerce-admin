import { createFileRoute } from '@tanstack/react-router'
import {
  listStockBalances,
  getStockBalance,
  adjustStockBalance,
  type StockBalanceFilters,
  type StockAdjustmentInput,
} from '@/server/fns/stock-balances'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'

const GET = withAuth(
  [
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.SALES_VIEW,
    PERMISSIONS.ORDERS_VIEW,
    PERMISSIONS.ORDERS_CREATE,
  ],
  async ({ request, auth }) => {
  try {
    const { userId } = auth
    const { searchParams } = new URL(request.url)

    const id = searchParams.get('id')
    if (id) {
      const data = await getStockBalance(userId, id)
      return Response.json({ success: true, data })
    }

    const warehouseIdParam = searchParams.get('warehouseId')
    const warehouseIdsParam = searchParams.get('warehouseIds')
    let warehouseIds: string[] | undefined = undefined
    if (warehouseIdsParam) {
      warehouseIds = warehouseIdsParam
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    } else if (warehouseIdParam && warehouseIdParam.includes(',')) {
      warehouseIds = warehouseIdParam
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    }

    const filters: StockBalanceFilters = {
      warehouseId: warehouseIdParam && !warehouseIdParam.includes(',') ? warehouseIdParam : undefined,
      warehouseIds,
      storeId: searchParams.get('storeId') ?? undefined,
      locationId: searchParams.get('locationId') ?? undefined,
      productVariantId: searchParams.get('productVariantId') ?? undefined,
      condition: searchParams.get('condition') ?? undefined,
      search: searchParams.get('search') ?? undefined,
      facilityType: (searchParams.get('facilityType') as StockBalanceFilters['facilityType']) ?? undefined,
      stockStatus: (searchParams.get('stockStatus') as StockBalanceFilters['stockStatus']) ?? undefined,
      page: searchParams.get('page') ? Number(searchParams.get('page')) : undefined,
      pageSize: searchParams.get('pageSize') ? Number(searchParams.get('pageSize')) : undefined,
      limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined,
      offset: searchParams.get('offset') ? Number(searchParams.get('offset')) : undefined,
      sortBy: (searchParams.get('sortBy') as StockBalanceFilters['sortBy']) ?? undefined,
      sortOrder: (searchParams.get('sortOrder') as StockBalanceFilters['sortOrder']) ?? undefined,
    }

    const data = await listStockBalances(userId, filters)
    return Response.json({ success: true, ...data })
  } catch (error) {
    return handleRouteError(error, 'Unable to fetch stock balances')
  }
})

const POST = withAuth(PERMISSIONS.INVENTORY_MANAGE, async ({ request, auth }) => {
  try {
    const { userId } = auth
    const body = (await request.json()) as StockAdjustmentInput
    const data = await adjustStockBalance(userId, body)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to adjust stock balance')
  }
})

export const Route = createFileRoute('/api/inventory/stock-balances')({
  server: {
    handlers: {
      GET,
      POST,
    },
  },
})
