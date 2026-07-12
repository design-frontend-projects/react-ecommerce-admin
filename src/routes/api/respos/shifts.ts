import { listShifts, openShift, runShiftMaintenance } from '@/server/fns/shifts'
import { handleRouteError } from '@/server/utils/api-error'
import { getBearerToken, requireAuth } from '@/server/utils/auth'
import { createAPIFileRoute } from '@tanstack/react-start/api'
import {
  listShiftsQuerySchema,
  openShiftInputSchema,
} from '@/features/respos/data/shift-schemas'

const GET = async ({ request }: { request: Request }) => {
  try {
    const token = getBearerToken(request)
    await requireAuth(token, 'shifts.view')

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
}

const POST = async ({ request }: { request: Request }) => {
  try {
    const token = getBearerToken(request)
    const actor = await requireAuth(token, 'shifts.use')

    const input = openShiftInputSchema.parse(await request.json())
    const data = await openShift(input, actor)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to open shift')
  }
}

export const APIRoute = createAPIFileRoute('/api/respos/shifts')({
  GET,
  POST,
})
