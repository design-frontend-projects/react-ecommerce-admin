import { createFileRoute } from '@tanstack/react-router'
import { listActiveShifts } from '@/server/fns/shifts'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'

const GET = withAuth(PERMISSIONS.SHIFTS_VIEW, async ({ request }) => {
  try {
    const branchId =
      new URL(request.url).searchParams.get('branchId') ?? undefined
    const shifts = await listActiveShifts(branchId)
    return Response.json({ success: true, data: { shifts } })
  } catch (error) {
    return handleRouteError(error, 'Unable to fetch active shifts')
  }
})

export const Route = createFileRoute('/api/respos/shifts/active')({
  server: {
    handlers: {
      GET,
    },
  },
})
