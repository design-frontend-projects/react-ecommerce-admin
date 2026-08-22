import { createFileRoute } from '@tanstack/react-router'
import {
  listCustomerReturns,
  createCustomerReturn,
} from '@/server/fns/customer-returns'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'

const GET = withAuth(PERMISSIONS.INVENTORY_VIEW, async ({ auth }) => {
  try {
    const data = await listCustomerReturns(auth.userId)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to fetch customer returns')
  }
})

const POST = withAuth(PERMISSIONS.INVENTORY_MANAGE, async ({ request, auth }) => {
  try {
    const body = await request.json()
    const data = await createCustomerReturn(auth.userId, body)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to create customer return')
  }
})

export const Route = createFileRoute('/api/inventory/customer-returns')({
  server: {
    handlers: {
      GET,
      POST,
    },
  },
})
