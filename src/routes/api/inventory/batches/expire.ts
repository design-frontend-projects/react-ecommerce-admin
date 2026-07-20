import { createFileRoute } from '@tanstack/react-router'
import { expireBatches } from '@/server/fns/batches'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'

const POST = withAuth(PERMISSIONS.INVENTORY_MANAGE, async ({ auth }) => {
  try {
    const { userId } = auth
    const data = await expireBatches(userId)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to run the expiry sweep')
  }
})

export const Route = createFileRoute('/api/inventory/batches/expire')({
  server: {
    handlers: {
      POST,
    },
  },
})
