import { createFileRoute } from '@tanstack/react-router'
import {
  listInventoryValuation,
  getValuationFilterLookups,
  type ValuationFilters,
} from '@/server/fns/inventory-valuation'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'

const GET = withAuth([PERMISSIONS.INVENTORY_VIEW], async ({ request, auth }) => {
  try {
    const { userId } = auth
    const { searchParams } = new URL(request.url)

    // If requesting filter lookup options (warehouses, stores, categories, suppliers)
    if (searchParams.get('lookups') === 'true' || searchParams.get('type') === 'options') {
      const lookups = await getValuationFilterLookups(userId)
      return Response.json({ success: true, ...lookups })
    }

    const filters: ValuationFilters = {
      search: searchParams.get('search') ?? undefined,
      warehouseId: searchParams.get('warehouseId') ?? undefined,
      storeId: searchParams.get('storeId') ?? undefined,
      categoryId: searchParams.get('categoryId') ?? undefined,
      supplierId: searchParams.get('supplierId') ?? undefined,
      condition: searchParams.get('condition') ?? undefined,
      stockStatus: (searchParams.get('stockStatus') as ValuationFilters['stockStatus']) ?? undefined,
      valuationMethod: (searchParams.get('valuationMethod') as ValuationFilters['valuationMethod']) ?? 'avco',
      page: searchParams.get('page') ? Number(searchParams.get('page')) : 1,
      limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : 25,
      sortBy: (searchParams.get('sortBy') as ValuationFilters['sortBy']) ?? 'totalValue',
      sortOrder: (searchParams.get('sortOrder') as ValuationFilters['sortOrder']) ?? 'desc',
    }

    const data = await listInventoryValuation(userId, filters)
    return Response.json({ success: true, ...data })
  } catch (error) {
    return handleRouteError(error, 'Unable to fetch inventory valuation data')
  }
})

export const Route = createFileRoute('/api/inventory/valuation')({
  server: {
    handlers: {
      GET,
    },
  },
})
