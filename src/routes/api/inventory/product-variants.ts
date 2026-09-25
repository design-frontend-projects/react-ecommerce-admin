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
      const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 25

      const data = await searchProductVariants(userId, search, limit)
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
