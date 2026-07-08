import {
  listMovements,
  type MovementFilters,
} from '@/server/fns/inventory-movements'
import { getBearerToken, requireAuth } from '@/server/utils/auth'
import { handleRouteError } from '@/server/utils/api-error'

export async function GET(request: Request): Promise<Response> {
  try {
    const token = getBearerToken(request)
    const { userId } = await requireAuth(token, 'inventory.view')

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
}
