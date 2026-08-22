import { createFileRoute } from '@tanstack/react-router'
import { getLookupTree } from '@/server/fns/lookups'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'

const GET = withAuth(PERMISSIONS.INVENTORY_VIEW, async ({ auth }) => {
  try {
    const { userId } = auth
    const data = await getLookupTree(userId)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to fetch lookup tree hierarchy')
  }
})

export const Route = createFileRoute('/api/lookups/tree')({
  server: {
    handlers: {
      GET,
    },
  },
})
