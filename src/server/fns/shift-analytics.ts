// Shift analytics aggregations (specs/026 FR-5). All math runs in Postgres;
// money comes back as decimal strings.
import { ApiError } from '@/server/utils/api-error'
import prisma from '@/lib/prisma'

export type ShiftAnalyticsRange = '1d' | '7d' | '15d' | '30d' | '90d'
export type ShiftAnalyticsMetric =
  | 'duration'
  | 'variance'
  | 'coverage'
  | 'offenders'

const RANGE_DAYS: Record<ShiftAnalyticsRange, number> = {
  '1d': 1,
  '7d': 7,
  '15d': 15,
  '30d': 30,
  '90d': 90,
}

const DEFAULT_VARIANCE_THRESHOLD = 10

function toNumber(value: unknown): number {
  return value === null || value === undefined ? 0 : Number(value)
}

function toMoney(value: unknown): string {
  return toNumber(value).toFixed(2)
}

function toDay(value: unknown): string {
  return new Date(String(value)).toISOString().slice(0, 10)
}

async function getVarianceThreshold(): Promise<number> {
  const row = (await prisma.res_shift_settings.findFirst({
    where: { branch_id: null },
    select: { variance_threshold: true },
  })) as { variance_threshold: unknown } | null
  return row ? toNumber(row.variance_threshold) : DEFAULT_VARIANCE_THRESHOLD
}

export async function getDurationTrends(
  range: ShiftAnalyticsRange,
  branchId?: string
) {
  const days = RANGE_DAYS[range]
  const rows = (await prisma.$queryRaw`
    SELECT date_trunc('day', opened_at) AS day,
           AVG(EXTRACT(EPOCH FROM (closed_at - opened_at))) / 3600 AS avg_hours,
           percentile_cont(0.5) WITHIN GROUP (
             ORDER BY EXTRACT(EPOCH FROM (closed_at - opened_at))
           ) / 3600 AS median_hours,
           COUNT(*)::int AS shifts
    FROM res_shifts
    WHERE status IN ('closed', 'force_closed')
      AND closed_at IS NOT NULL
      AND opened_at >= now() - make_interval(days => ${days})
      AND (${branchId ?? null}::uuid IS NULL OR branch_id = ${branchId ?? null}::uuid)
    GROUP BY 1
    ORDER BY 1
  `) as Array<{
    day: unknown
    avg_hours: unknown
    median_hours: unknown
    shifts: unknown
  }>

  return {
    points: rows.map((row) => ({
      day: toDay(row.day),
      avgHours: Math.round(toNumber(row.avg_hours) * 100) / 100,
      medianHours: Math.round(toNumber(row.median_hours) * 100) / 100,
      shifts: toNumber(row.shifts),
    })),
  }
}

export async function getVarianceTrends(
  range: ShiftAnalyticsRange,
  branchId?: string
) {
  const days = RANGE_DAYS[range]
  const threshold = await getVarianceThreshold()
  const rows = (await prisma.$queryRaw`
    SELECT date_trunc('day', closed_at) AS day,
           COALESCE(auth_user_id::text, 'unknown') AS key,
           COALESCE(opened_by, 'Unknown') AS label,
           SUM(variance) AS total_variance,
           AVG(ABS(variance)) AS avg_abs_variance,
           COUNT(*) FILTER (WHERE ABS(variance) > ${threshold})::int AS over_threshold
    FROM res_shifts
    WHERE variance IS NOT NULL
      AND closed_at >= now() - make_interval(days => ${days})
      AND (${branchId ?? null}::uuid IS NULL OR branch_id = ${branchId ?? null}::uuid)
    GROUP BY 1, 2, 3
    ORDER BY 1
  `) as Array<{
    day: unknown
    key: string
    label: string
    total_variance: unknown
    avg_abs_variance: unknown
    over_threshold: unknown
  }>

  const seriesMap = new Map<
    string,
    {
      key: string
      label: string
      points: Array<{
        day: string
        totalVariance: string
        avgAbsVariance: string
        overThreshold: number
      }>
    }
  >()

  for (const row of rows) {
    const existing = seriesMap.get(row.key) ?? {
      key: row.key,
      label: row.label,
      points: [],
    }
    existing.points.push({
      day: toDay(row.day),
      totalVariance: toMoney(row.total_variance),
      avgAbsVariance: toMoney(row.avg_abs_variance),
      overThreshold: toNumber(row.over_threshold),
    })
    seriesMap.set(row.key, existing)
  }

  return { series: [...seriesMap.values()], threshold: threshold.toFixed(2) }
}

export async function getCoverageGrid(
  range: ShiftAnalyticsRange,
  branchId?: string
) {
  const days = RANGE_DAYS[range]
  const rows = (await prisma.$queryRaw`
    SELECT EXTRACT(ISODOW FROM bucket.h)::int AS weekday,
           EXTRACT(HOUR FROM bucket.h)::int AS hour,
           AVG(bucket.cnt)::float AS avg_headcount
    FROM (
      SELECT h,
             (
               SELECT COUNT(DISTINCT s.auth_user_id)
               FROM res_shifts s
               WHERE s.opened_at < h + interval '1 hour'
                 AND COALESCE(s.closed_at, now()) > h
                 AND (${branchId ?? null}::uuid IS NULL OR s.branch_id = ${branchId ?? null}::uuid)
             ) AS cnt
      FROM generate_series(
        date_trunc('hour', now()) - make_interval(days => ${days}),
        date_trunc('hour', now()),
        interval '1 hour'
      ) AS h
    ) AS bucket
    GROUP BY 1, 2
    ORDER BY 1, 2
  `) as Array<{ weekday: unknown; hour: unknown; avg_headcount: unknown }>

  return {
    grid: rows.map((row) => ({
      weekday: toNumber(row.weekday),
      hour: toNumber(row.hour),
      avgHeadcount: Math.round(toNumber(row.avg_headcount) * 100) / 100,
    })),
  }
}

export async function getTopOffenders(
  range: ShiftAnalyticsRange,
  branchId?: string
) {
  const days = RANGE_DAYS[range]
  const threshold = await getVarianceThreshold()
  const rows = (await prisma.$queryRaw`
    SELECT COALESCE(auth_user_id::text, 'unknown') AS user_id,
           COALESCE(opened_by, 'Unknown') AS employee_name,
           COUNT(*)::int AS shifts,
           SUM(ABS(variance)) AS sum_abs_variance,
           COUNT(*) FILTER (WHERE ABS(variance) > ${threshold})::int AS count_over_threshold
    FROM res_shifts
    WHERE variance IS NOT NULL
      AND closed_at >= now() - make_interval(days => ${days})
      AND (${branchId ?? null}::uuid IS NULL OR branch_id = ${branchId ?? null}::uuid)
    GROUP BY 1, 2
    ORDER BY SUM(ABS(variance)) DESC
    LIMIT 20
  `) as Array<{
    user_id: string
    employee_name: string
    shifts: unknown
    sum_abs_variance: unknown
    count_over_threshold: unknown
  }>

  return {
    rows: rows.map((row) => ({
      userId: row.user_id,
      employeeName: row.employee_name,
      shifts: toNumber(row.shifts),
      sumAbsVariance: toMoney(row.sum_abs_variance),
      countOverThreshold: toNumber(row.count_over_threshold),
    })),
    threshold: threshold.toFixed(2),
  }
}

export async function getShiftAnalytics(
  metric: ShiftAnalyticsMetric,
  range: ShiftAnalyticsRange,
  branchId?: string
) {
  switch (metric) {
    case 'duration':
      return getDurationTrends(range, branchId)
    case 'variance':
      return getVarianceTrends(range, branchId)
    case 'coverage':
      return getCoverageGrid(range, branchId)
    case 'offenders':
      return getTopOffenders(range, branchId)
    default:
      throw new ApiError('Unknown analytics metric.', 400)
  }
}
