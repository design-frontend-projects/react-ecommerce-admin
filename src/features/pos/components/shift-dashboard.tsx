import { useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
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
  DollarSign,
  Package,
  ReceiptText,
  RefreshCcw,
  ShoppingCart,
  Undo2,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  type ShiftRangeDays,
  getShiftDashboardAnalytics,
} from '../data/dashboard-api'

const RANGE_OPTIONS: Array<{ value: ShiftRangeDays; label: string }> = [
  { value: 1, label: '1D' },
  { value: 7, label: '7D' },
  { value: 15, label: '15D' },
  { value: 30, label: '30D' },
]

const formatTimestamp = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

const formatAxisCurrency = (value: number) => {
  const amount = Number(value) || 0
  if (Math.abs(amount) >= 1000000) return `${(amount / 1000000).toFixed(1)}M`
  if (Math.abs(amount) >= 1000) return `${(amount / 1000).toFixed(1)}K`
  return Math.round(amount).toString()
}

export function ShiftDashboard() {
  const [rangeDays, setRangeDays] = useState<ShiftRangeDays>(1)

  const {
    data: analytics,
    isLoading,
    isError,
    isFetching,
    error,
    refetch,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ['shift-dashboard-analytics', rangeDays],
    queryFn: () => getShiftDashboardAnalytics(rangeDays),
    refetchInterval: 60000,
  })

  return (
    <div className='space-y-6 p-6'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>Shift Dashboard</h1>
          <p className='mt-1 text-sm text-muted-foreground'>
            Rolling analytics powered by transactions, transaction details,
            products, and refunds.
          </p>
        </div>

        <div className='flex items-center gap-3'>
          <Tabs
            value={String(rangeDays)}
            onValueChange={(value) => setRangeDays(Number(value) as ShiftRangeDays)}
          >
            <TabsList>
              {RANGE_OPTIONS.map((option) => (
                <TabsTrigger key={option.value} value={String(option.value)}>
                  {option.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {isFetching && !isLoading && (
            <div className='flex items-center gap-1 text-xs text-muted-foreground'>
              <RefreshCcw className='h-3 w-3 animate-spin' />
              Updating
            </div>
          )}
        </div>
      </div>

      {!isLoading && !isError && (
        <div className='text-xs text-muted-foreground'>
          Last updated:{' '}
          {dataUpdatedAt ? formatTimestamp(new Date(dataUpdatedAt).toISOString()) : '—'}
        </div>
      )}

      {isLoading && <ShiftDashboardSkeleton />}

      {isError && (
        <Card className='border-destructive/30'>
          <CardHeader>
            <CardTitle className='text-destructive'>
              Failed to load shift analytics
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <p className='text-sm text-muted-foreground'>
              {(error as Error)?.message || 'Unknown analytics error.'}
            </p>
            <Button onClick={() => refetch()}>Retry</Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && analytics && (
        <>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4'>
            <MetricCard
              title='Gross Sales'
              value={formatCurrency(analytics.kpis.grossSales)}
              icon={<DollarSign className='h-4 w-4 text-muted-foreground' />}
            />
            <MetricCard
              title='Refund Amount'
              value={formatCurrency(analytics.kpis.refundAmount)}
              icon={<Undo2 className='h-4 w-4 text-muted-foreground' />}
              valueClassName='text-destructive'
            />
            <MetricCard
              title='Net Sales'
              value={formatCurrency(analytics.kpis.netSales)}
              icon={<ReceiptText className='h-4 w-4 text-muted-foreground' />}
            />
            <MetricCard
              title='Orders'
              value={analytics.kpis.orderCount.toString()}
              icon={<ShoppingCart className='h-4 w-4 text-muted-foreground' />}
            />
            <MetricCard
              title='Avg Order Value'
              value={formatCurrency(analytics.kpis.avgOrderValue)}
              icon={<DollarSign className='h-4 w-4 text-muted-foreground' />}
            />
            <MetricCard
              title='Items Sold'
              value={analytics.kpis.itemsSold.toFixed(0)}
              icon={<Package className='h-4 w-4 text-muted-foreground' />}
            />
            <MetricCard
              title='Refund Count'
              value={analytics.kpis.refundCount.toString()}
              icon={<Undo2 className='h-4 w-4 text-muted-foreground' />}
            />
            <MetricCard
              title='Refund Rate'
              value={`${analytics.kpis.refundRate.toFixed(1)}%`}
              icon={<ReceiptText className='h-4 w-4 text-muted-foreground' />}
            />
          </div>

          <div className='grid grid-cols-1 gap-6 xl:grid-cols-3'>
            <Card className='xl:col-span-2'>
              <CardHeader>
                <CardTitle>Sales / Refund Trend</CardTitle>
              </CardHeader>
              <CardContent>
                {analytics.trend.length > 0 ? (
                  <div className='h-[320px] w-full'>
                    <ResponsiveContainer width='100%' height='100%'>
                      <AreaChart data={analytics.trend}>
                        <CartesianGrid strokeDasharray='3 3' />
                        <XAxis
                          dataKey='label'
                          tick={{ fontSize: 12 }}
                          minTickGap={20}
                        />
                        <YAxis
                          tickFormatter={formatAxisCurrency}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip
                          formatter={(value: number, name: string) => [
                            formatCurrency(Number(value)),
                            name === 'sales'
                              ? 'Sales'
                              : name === 'refunds'
                                ? 'Refunds'
                                : 'Net',
                          ]}
                          labelFormatter={(label) => `Bucket: ${label}`}
                        />
                        <Area
                          type='monotone'
                          dataKey='sales'
                          name='sales'
                          stroke='#16a34a'
                          fill='#16a34a22'
                          strokeWidth={2}
                        />
                        <Area
                          type='monotone'
                          dataKey='refunds'
                          name='refunds'
                          stroke='#dc2626'
                          fill='#dc262622'
                          strokeWidth={2}
                        />
                        <Area
                          type='monotone'
                          dataKey='net'
                          name='net'
                          stroke='#2563eb'
                          fill='#2563eb1f'
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptySection message='No trend data available for this range.' />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Products</CardTitle>
              </CardHeader>
              <CardContent>
                {analytics.topProducts.length === 0 ? (
                  <EmptySection message='No product sales yet for this range.' />
                ) : (
                  <div className='space-y-3'>
                    {analytics.topProducts.map((product) => (
                      <div
                        key={product.productId}
                        className='flex items-center justify-between rounded-md border p-3'
                      >
                        <div className='min-w-0'>
                          <p className='truncate text-sm font-medium'>
                            {product.name}
                          </p>
                          <p className='text-xs text-muted-foreground'>
                            {product.sku || 'No SKU'}
                          </p>
                        </div>
                        <div className='text-right'>
                          <p className='text-sm font-bold'>
                            {product.quantitySold.toFixed(0)} units
                          </p>
                          <p className='text-xs text-muted-foreground'>
                            {formatCurrency(product.revenue)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.recentActivity.length === 0 ? (
                <EmptySection message='No sales or refunds in this range.' />
              ) : (
                <div className='relative w-full overflow-auto'>
                  <table className='w-full caption-bottom text-sm'>
                    <thead className='[&_tr]:border-b'>
                      <tr className='border-b transition-colors'>
                        <th className='h-12 px-4 text-left align-middle font-medium text-muted-foreground'>
                          Reference
                        </th>
                        <th className='h-12 px-4 text-left align-middle font-medium text-muted-foreground'>
                          Time
                        </th>
                        <th className='h-12 px-4 text-left align-middle font-medium text-muted-foreground'>
                          Type
                        </th>
                        <th className='h-12 px-4 text-right align-middle font-medium text-muted-foreground'>
                          Amount
                        </th>
                        <th className='h-12 px-4 text-left align-middle font-medium text-muted-foreground'>
                          Note
                        </th>
                      </tr>
                    </thead>
                    <tbody className='[&_tr:last-child]:border-0'>
                      {analytics.recentActivity.map((activity) => (
                        <tr
                          key={activity.id}
                          className='border-b transition-colors hover:bg-muted/50'
                        >
                          <td className='p-4 align-middle font-medium'>
                            {activity.reference}
                          </td>
                          <td className='p-4 align-middle text-muted-foreground'>
                            {formatTimestamp(activity.timestamp)}
                          </td>
                          <td className='p-4 align-middle'>
                            <Badge
                              variant='outline'
                              className={
                                activity.type === 'sale'
                                  ? 'border-emerald-500 text-emerald-600'
                                  : 'border-destructive text-destructive'
                              }
                            >
                              {activity.type}
                            </Badge>
                          </td>
                          <td
                            className={`p-4 text-right align-middle font-bold ${
                              activity.amount < 0
                                ? 'text-destructive'
                                : 'text-emerald-600'
                            }`}
                          >
                            {activity.amount < 0 ? '-' : '+'}
                            {formatCurrency(Math.abs(activity.amount))}
                          </td>
                          <td className='p-4 align-middle text-muted-foreground'>
                            {activity.note || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function MetricCard({
  title,
  value,
  icon,
  valueClassName,
}: {
  title: string
  value: string
  icon: ReactNode
  valueClassName?: string
}) {
  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
        <CardTitle className='text-sm font-medium'>{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${valueClassName || ''}`}>{value}</div>
      </CardContent>
    </Card>
  )
}

function ShiftDashboardSkeleton() {
  return (
    <div className='space-y-6'>
      <div className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4'>
        {Array.from({ length: 8 }, (_, idx) => (
          <Card key={idx}>
            <CardHeader className='space-y-2'>
              <Skeleton className='h-4 w-1/2' />
              <Skeleton className='h-7 w-3/4' />
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className='grid grid-cols-1 gap-6 xl:grid-cols-3'>
        <Card className='xl:col-span-2'>
          <CardHeader>
            <Skeleton className='h-5 w-48' />
          </CardHeader>
          <CardContent>
            <Skeleton className='h-[320px] w-full' />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className='h-5 w-32' />
          </CardHeader>
          <CardContent className='space-y-3'>
            {Array.from({ length: 5 }, (_, idx) => (
              <Skeleton key={idx} className='h-14 w-full' />
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <Skeleton className='h-5 w-40' />
        </CardHeader>
        <CardContent className='space-y-2'>
          {Array.from({ length: 6 }, (_, idx) => (
            <Skeleton key={idx} className='h-10 w-full' />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function EmptySection({ message }: { message: string }) {
  return (
    <div className='flex min-h-[120px] items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground'>
      {message}
    </div>
  )
}
