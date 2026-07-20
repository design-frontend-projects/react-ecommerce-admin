import { createAPIFileRoute } from '@tanstack/react-start/api'
import { getNavCatalog } from '@/server/fns/screens'
import { withAuth } from '@/server/utils/with-auth'

/**
 * Navigation catalog for the current user. Auth-only (no specific permission)
 * because it describes the user's own nav; the client filters screens against
 * the user's resolved access. Falls back to the static sidebar array when this
 * returns nothing.
 */
const GET = withAuth(null, async () => {
  const data = await getNavCatalog()
  return Response.json({ success: true, data })
})

export const APIRoute = createAPIFileRoute('/api/rbac/me/nav')({
  GET,
})
