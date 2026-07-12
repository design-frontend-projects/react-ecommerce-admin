import {
  getShiftAnalytics,
  type ShiftAnalyticsMetric,
  type ShiftAnalyticsRange,
} from '@/server/fns/shift-analytics'
import { handleRouteError } from '@/server/utils/api-error'
import { getBearerToken, requireAuth } from '@/server/utils/auth'
import { jsonError } from '@/server/utils/http'
import { createAPIFileRoute } from '@tanstack/react-start/api'

const METRICS = ['duration', 'variance', 'coverage', 'offenders'] as const
const RANGES = ['1d', '7d', '15d', '30d', '90d'] as const

const GET = async ({ request }: { request: Request }) => {
  try {
    const token = getBearerToken(request)
    await requireAuth(token, 'shifts.view')

    const url = new URL(request.url)
    const metric = url.searchParams.get('metric') as ShiftAnalyticsMetric
    const range = (url.searchParams.get('range') ?? '7d') as ShiftAnalyticsRange
    const branchId = url.searchParams.get('branchId') ?? undefined

    if (!METRICS.includes(metric)) {
      return jsonError('Invalid analytics metric.', 400)
    }
    if (!RANGES.includes(range)) {
      return jsonError('Invalid analytics range.', 400)
    }

    const data = await getShiftAnalytics(metric, range, branchId)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to fetch shift analytics')
  }
}

export const APIRoute = createAPIFileRoute('/api/respos/shifts/analytics')({
  GET,
})
