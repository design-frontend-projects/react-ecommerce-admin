import { createFileRoute } from '@tanstack/react-router'
import { receiveCustomerReturn } from '@/server/fns/customer-returns'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'

const POST = withAuth(PERMISSIONS.INVENTORY_MANAGE, async ({ request, auth }) => {
  try {
    const body = await request.json()
    const data = await receiveCustomerReturn(auth.userId, body.id)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to receive customer return')
  }
})

export const Route = createFileRoute('/api/inventory/customer-returns/receive')({
  server: {
    handlers: {
      POST,
    },
  },
})
