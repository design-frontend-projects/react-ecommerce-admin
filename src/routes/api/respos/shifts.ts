import { createFileRoute } from '@tanstack/react-router'
import { listShifts, openShift, runShiftMaintenance } from '@/server/fns/shifts'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import {
  listShiftsQuerySchema,
  openShiftInputSchema,
} from '@/features/respos/data/shift-schemas'
import { PERMISSIONS } from '@/features/users/data/permission-constants'

const GET = withAuth(PERMISSIONS.SHIFTS_VIEW, async ({ request }) => {
  try {
    // Lazy fallback for stale-flag/auto-close when pg_cron is unavailable.
    await runShiftMaintenance()

    const url = new URL(request.url)
    const query = listShiftsQuerySchema.parse({
      status: url.searchParams.get('status') ?? undefined,
      userId: url.searchParams.get('userId') ?? undefined,
      branchId: url.searchParams.get('branchId') ?? undefined,
      from: url.searchParams.get('from') ?? undefined,
      to: url.searchParams.get('to') ?? undefined,
      needsReview: url.searchParams.has('needsReview')
        ? url.searchParams.get('needsReview') === 'true'
        : undefined,
      page: url.searchParams.has('page')
        ? Number(url.searchParams.get('page'))
        : undefined,
      pageSize: url.searchParams.has('pageSize')
        ? Number(url.searchParams.get('pageSize'))
        : undefined,
    })

    const data = await listShifts(query)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to fetch shifts')
  }
})

const POST = withAuth(PERMISSIONS.SHIFTS_USE, async ({ request, auth }) => {
  try {
    const input = openShiftInputSchema.parse(await request.json())
    const data = await openShift(input, auth)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to open shift')
  }
})

export const Route = createFileRoute('/api/respos/shifts')({
  server: {
    handlers: {
      GET,
      POST,
    },
  },
})
