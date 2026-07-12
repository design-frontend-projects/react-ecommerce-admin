// Shift analytics tab (specs/026 FR-5): duration trends, variance trends,
// staffing coverage heat grid, and top variance offenders. Follows the
// Recharts + range-Tabs pattern from src/features/pos/components/shift-dashboard.tsx.
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useShiftAnalytics } from '../api/shift-hooks'
import type {
  ShiftAnalyticsRange,
  ShiftCoverageCell,
  ShiftDurationPoint,
  ShiftOffenderRow,
  ShiftVarianceSeries,
} from '../data/shift-actions'
import { formatCurrency } from '../lib/formatters'

const RANGES: ShiftAnalyticsRange[] = ['7d', '15d', '30d', '90d']
const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function CoverageGrid({ cells }: { cells: ShiftCoverageCell[] }) {
  const byKey = new Map(
    cells.map((cell) => [`${cell.weekday}-${cell.hour}`, cell.avgHeadcount])
  )
  const max = Math.max(1, ...cells.map((cell) => cell.avgHeadcount))

  return (
    <div className='overflow-x-auto'>
      <div className='inline-block'>
        <div className='grid grid-cols-[3rem_repeat(24,1.4rem)] gap-0.5 text-[10px]'>
          <div />
          {Array.from({ length: 24 }, (_, hour) => (
            <div key={hour} className='text-center text-muted-foreground'>
              {hour}
            </div>
          ))}
          {WEEKDAY_LABELS.map((label, index) => (
            <>
              <div
                key={`label-${label}`}
                className='pe-1 text-end text-muted-foreground'
              >
                {label}
              </div>
              {Array.from({ length: 24 }, (_, hour) => {
                const value = byKey.get(`${index + 1}-${hour}`) ?? 0
                const intensity = value / max
                return (
                  <div
                    key={`${label}-${hour}`}
                    title={`${label} ${hour}:00 — ${value}`}
                    className='h-5 w-full rounded-sm'
                    style={{
                      backgroundColor: `rgba(34, 197, 94, ${Math.max(0.06, intensity)})`,
                    }}
                  />
                )
              })}
            </>
          ))}
        </div>
      </div>
    </div>
  )
}

export function ShiftAnalyticsTab({ branchId }: { branchId?: string }) {
  const { t } = useTranslation()
  const [range, setRange] = useState<ShiftAnalyticsRange>('7d')

  const duration = useShiftAnalytics<{ points: ShiftDurationPoint[] }>(
    'duration',
    range,
    branchId
  )
  const variance = useShiftAnalytics<{
    series: ShiftVarianceSeries[]
    threshold: string
  }>('variance', range, branchId)
  const coverage = useShiftAnalytics<{ grid: ShiftCoverageCell[] }>(
    'coverage',
    range,
    branchId
  )
  const offenders = useShiftAnalytics<{
    rows: ShiftOffenderRow[]
    threshold: string
  }>('offenders', range, branchId)

  const isLoading =
    duration.isLoading ||
    variance.isLoading ||
    coverage.isLoading ||
    offenders.isLoading

  // Sum all employees' daily variance into one trend for the chart.
  const varianceTrend = (() => {
    const byDay = new Map<string, number>()
    for (const series of variance.data?.series ?? []) {
      for (const point of series.points) {
        byDay.set(
          point.day,
          (byDay.get(point.day) ?? 0) + Number(point.totalVariance)
        )
      }
    }
    return [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, total]) => ({ day, total: Math.round(total * 100) / 100 }))
  })()

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h3 className='text-lg font-semibold'>
          {t('shifts.analytics.title', 'Shift Analytics')}
        </h3>
        <Tabs
          value={range}
          onValueChange={(value) => setRange(value as ShiftAnalyticsRange)}
        >
          <TabsList>
            {RANGES.map((rangeOption) => (
              <TabsTrigger key={rangeOption} value={rangeOption}>
                {rangeOption.toUpperCase()}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <div className='flex justify-center py-12'>
          <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
        </div>
      ) : (
        <div className='grid gap-6 lg:grid-cols-2'>
          <Card>
            <CardHeader>
              <CardTitle className='text-base'>
                {t('shifts.analytics.duration', 'Shift Duration Trends')}
              </CardTitle>
              <CardDescription>
                {t(
                  'shifts.analytics.durationDesc',
                  'Average and median shift length per day (hours). Auto-closed shifts excluded.'
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className='h-64'>
              <ResponsiveContainer width='100%' height='100%'>
                <AreaChart data={duration.data?.points ?? []}>
                  <CartesianGrid strokeDasharray='3 3' opacity={0.3} />
                  <XAxis dataKey='day' fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Area
                    type='monotone'
                    dataKey='avgHours'
                    name={t('shifts.analytics.avgHours', 'Avg hours')}
                    stroke='#22c55e'
                    fill='#22c55e33'
                  />
                  <Area
                    type='monotone'
                    dataKey='medianHours'
                    name={t('shifts.analytics.medianHours', 'Median hours')}
                    stroke='#3b82f6'
                    fill='#3b82f633'
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className='text-base'>
                {t('shifts.analytics.variance', 'Cash Variance Trend')}
              </CardTitle>
              <CardDescription>
                {t(
                  'shifts.analytics.varianceDesc',
                  'Total daily cash variance across all closed shifts.'
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className='h-64'>
              <ResponsiveContainer width='100%' height='100%'>
                <AreaChart data={varianceTrend}>
                  <CartesianGrid strokeDasharray='3 3' opacity={0.3} />
                  <XAxis dataKey='day' fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Area
                    type='monotone'
                    dataKey='total'
                    name={t('shifts.analytics.totalVariance', 'Total variance')}
                    stroke='#ef4444'
                    fill='#ef444433'
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className='text-base'>
                {t('shifts.analytics.coverage', 'Staffing Coverage')}
              </CardTitle>
              <CardDescription>
                {t(
                  'shifts.analytics.coverageDesc',
                  'Average simultaneous open shifts by weekday and hour.'
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CoverageGrid cells={coverage.data?.grid ?? []} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className='text-base'>
                {t('shifts.analytics.offenders', 'Top Variance Offenders')}
              </CardTitle>
              <CardDescription>
                {t(
                  'shifts.analytics.offendersDesc',
                  'Employees ranked by total absolute variance (threshold: {{threshold}}).',
                  { threshold: offenders.data?.threshold ?? '10.00' }
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(offenders.data?.rows.length ?? 0) === 0 ? (
                <p className='py-6 text-center text-sm text-muted-foreground'>
                  {t('shifts.analytics.noData', 'No data for this range.')}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        {t('shifts.table.employee', 'Employee')}
                      </TableHead>
                      <TableHead className='text-right'>
                        {t('shifts.analytics.shiftCount', 'Shifts')}
                      </TableHead>
                      <TableHead className='text-right'>
                        {t('shifts.analytics.absVariance', 'Σ |variance|')}
                      </TableHead>
                      <TableHead className='text-right'>
                        {t('shifts.analytics.overThreshold', 'Over threshold')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {offenders.data?.rows.map((row) => (
                      <TableRow key={row.userId}>
                        <TableCell>{row.employeeName}</TableCell>
                        <TableCell className='text-right'>
                          {row.shifts}
                        </TableCell>
                        <TableCell className='text-right font-medium'>
                          {formatCurrency(Number(row.sumAbsVariance))}
                        </TableCell>
                        <TableCell className='text-right'>
                          {row.countOverThreshold}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
