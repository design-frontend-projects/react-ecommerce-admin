import { createFileRoute } from '@tanstack/react-router'
import { searchProductVariants } from '@/server/fns/product-variants'
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
      const search = searchParams.get('search') ?? ''
      const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined
      const page = searchParams.get('page') ? Number(searchParams.get('page')) : 1
      const pageSize = searchParams.get('pageSize')
        ? Number(searchParams.get('pageSize'))
        : limit ?? 10
      const sortBy = searchParams.get('sortBy') ?? undefined
      const sortOrder = (searchParams.get('sortOrder') ?? undefined) as 'asc' | 'desc' | undefined
      const productId = searchParams.get('productId') ?? undefined
      const isAssigned = searchParams.get('isAssigned') ?? undefined

      const data = await searchProductVariants(userId, {
        search,
        page,
        pageSize,
        limit,
        sortBy,
        sortOrder,
        productId,
        isAssigned,
      })
      return Response.json(data)
    } catch (error) {
      return handleRouteError(error, 'Unable to search product variants')
    }
  }
)

export const Route = createFileRoute('/api/inventory/product-variants')({
  server: {
    handlers: {
      GET,
    },
  },
})
