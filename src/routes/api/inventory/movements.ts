import { createFileRoute } from '@tanstack/react-router'
import {
  listMovements,
  type MovementFilters,
} from '@/server/fns/inventory-movements'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'

const GET = withAuth(PERMISSIONS.INVENTORY_VIEW, async ({ request, auth }) => {
  try {
    const { userId } = auth

    const { searchParams } = new URL(request.url)
    const filters: MovementFilters = {
      movementType: searchParams.get('movementType') ?? undefined,
      storeId: searchParams.get('storeId') ?? undefined,
      productVariantId: searchParams.get('productVariantId') ?? undefined,
      referenceType: searchParams.get('referenceType') ?? undefined,
      dateFrom: searchParams.get('dateFrom') ?? undefined,
      dateTo: searchParams.get('dateTo') ?? undefined,
      limit: searchParams.get('limit')
        ? Number(searchParams.get('limit'))
        : undefined,
    }

    const data = await listMovements(userId, filters)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to fetch movements')
  }
})

export const Route = createFileRoute('/api/inventory/movements')({
  server: {
    handlers: {
      GET,
    },
  },
})
