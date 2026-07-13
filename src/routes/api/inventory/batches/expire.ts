import { createAPIFileRoute } from '@tanstack/react-start/api'

import { expireBatches } from '@/server/fns/batches'
import { handleRouteError } from '@/server/utils/api-error'
import { getBearerToken, requireAuth } from '@/server/utils/auth'

const POST = async ({ request }: any) => {
  try {
    const token = getBearerToken(request)
    const { userId } = await requireAuth(token, 'inventory.manage')
    const data = await expireBatches(userId)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to run the expiry sweep')
  }
}

export const APIRoute = createAPIFileRoute('/api/inventory/batches/expire')({
  POST,
})
