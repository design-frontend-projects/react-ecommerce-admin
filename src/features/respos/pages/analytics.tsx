import { type ReactNode, useMemo, useState } from 'react'
import { BarChart3, ChartLine, Receipt, Table2, TrendingUp } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { LanguageSwitch } from '@/components/language-switch'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { useAnalyticsOrders, useFloors, useTables } from '../api/queries'
import { buildRestaurantAnalytics } from '../lib/analytics'
import { formatCurrency } from '../lib/formatters'

const RANGE_OPTIONS = [
  { value: 1, label: 'Last 1 day' },
  { value: 7, label: 'Last 7 days' },
  { value: 15, label: 'Last 15 days' },
  { value: 30, label: 'Last 30 days' },
]

export function Analytics() {
  const [days, setDays] = useState(30)

  const { data: analyticsOrders, isLoading: loadingOrders } = useAnalyticsOrders({
    days,
  })
  const { data: floors, isLoading: loadingFloors } = useFloors()
  const { data: tables, isLoading: loadingTables } = useTables()

  const isLoading = loadingOrders || loadingFloors || loadingTables

  const analytics = useMemo(
    () =>
      buildRestaurantAnalytics({
        orders: analyticsOrders || [],
        floors: floors || [],
        tables: tables || [],
        days,
      }),
    [analyticsOrders, days, floors, tables]
  )

  return (
    <>
      <Header>
        <div className='flex items-center gap-2'>
          <ChartLine className='h-5 w-5 text-orange-500' />
          <h1 className='text-lg font-semibold'>Restaurant Analytics</h1>
        </div>
        <div className='ml-auto flex items-center justify-end gap-2'>
          <LanguageSwitch />
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='grid gap-4'>
          <Card>
            <CardContent className='flex flex-col gap-3 pt-6 md:flex-row md:items-center md:justify-between'>
              <div className='space-y-1'>
                <p className='text-sm font-medium'>Analytics Window</p>
                <p className='text-xs text-muted-foreground'>
                  Revenue is based on paid orders. Volume excludes void/refunded
                  orders.
                </p>
              </div>
              <div className='w-full md:w-56'>
                <Select
                  value={String(days)}
                  onValueChange={(value) => setDays(Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Select range' />
                  </SelectTrigger>
                  <SelectContent>
                    {RANGE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={String(option.value)}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {isLoading ? (
            <div className='flex h-[420px] items-center justify-center'>
              <p className='text-muted-foreground'>Loading analytics data...</p>
            </div>
          ) : (
            <>
              <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
                <StatCard
                  title='Paid Revenue'
                  value={formatCurrency(analytics.kpis.paidRevenue)}
                  icon={<TrendingUp className='h-4 w-4 text-muted-foreground' />}
                />
                <StatCard
                  title='Order Volume'
                  value={analytics.kpis.orderVolume}
                  icon={<Receipt className='h-4 w-4 text-muted-foreground' />}
                />
                <StatCard
                  title='Items Sold'
                  value={analytics.kpis.itemsSold}
                  icon={<BarChart3 className='h-4 w-4 text-muted-foreground' />}
                />
                <StatCard
                  title='Avg Paid Order Value'
                  value={formatCurrency(analytics.kpis.avgPaidOrderValue)}
                  icon={<TrendingUp className='h-4 w-4 text-muted-foreground' />}
                />
                <StatCard
                  title='Occupied Tables'
                  value={analytics.kpis.occupiedTables}
                  icon={<Table2 className='h-4 w-4 text-muted-foreground' />}
                />
                <StatCard
                  title='Occupancy Rate'
                  value={`${analytics.kpis.occupancyRate.toFixed(1)}%`}
                  icon={<Table2 className='h-4 w-4 text-muted-foreground' />}
                />
              </div>

              <div className='grid gap-4 lg:grid-cols-2'>
                <Card>
                  <CardHeader>
                    <CardTitle>Daily Paid Revenue</CardTitle>
                  </CardHeader>
                  <CardContent className='h-[320px]'>
                    {analytics.dailyRevenue.length > 0 ? (
                      <ResponsiveContainer width='100%' height='100%'>
                        <LineChart data={analytics.dailyRevenue}>
                          <CartesianGrid strokeDasharray='3 3' vertical={false} />
                          <XAxis dataKey='label' tickLine={false} axisLine={false} />
                          <YAxis
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `${Number(value).toFixed(0)}`}
                            width={55}
                          />
                          <Tooltip
                            formatter={(value: number | string) => [
                              formatCurrency(Number(value)),
                              'Revenue',
                            ]}
                          />
                          <Line
                            type='monotone'
                            dataKey='revenue'
                            stroke='#f97316'
                            strokeWidth={2.5}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <EmptyState text='No revenue data in the selected range.' />
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Floor Occupancy</CardTitle>
                  </CardHeader>
                  <CardContent className='h-[320px]'>
                    {analytics.floorAnalytics.length > 0 ? (
                      <ResponsiveContainer width='100%' height='100%'>
                        <BarChart data={analytics.floorAnalytics}>
                          <CartesianGrid strokeDasharray='3 3' vertical={false} />
                          <XAxis
                            dataKey='floorName'
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `${Number(value).toFixed(0)}%`}
                            width={45}
                          />
                          <Tooltip
                            formatter={(value: number | string) => [
                              `${Number(value).toFixed(1)}%`,
                              'Occupancy',
                            ]}
                          />
                          <Bar
                            dataKey='occupancyRate'
                            fill='#f97316'
                            radius={[4, 4, 0, 0]}
                            maxBarSize={56}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <EmptyState text='No floor analytics available.' />
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className='grid gap-4 lg:grid-cols-2'>
                <Card>
                  <CardHeader>
                    <CardTitle>Top Items by Quantity</CardTitle>
                  </CardHeader>
                  <CardContent className='h-[320px]'>
                    {analytics.topItemsByQuantity.length > 0 ? (
                      <ResponsiveContainer width='100%' height='100%'>
                        <BarChart data={analytics.topItemsByQuantity.slice(0, 8)}>
                          <CartesianGrid strokeDasharray='3 3' vertical={false} />
                          <XAxis
                            dataKey='itemName'
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis tickLine={false} axisLine={false} width={40} />
                          <Tooltip
                            formatter={(value: number | string) => [
                              Number(value),
                              'Quantity',
                            ]}
                          />
                          <Bar
                            dataKey='quantity'
                            fill='#f97316'
                            radius={[4, 4, 0, 0]}
                            maxBarSize={56}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <EmptyState text='No ordered items found in selected range.' />
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Top Items by Revenue</CardTitle>
                  </CardHeader>
                  <CardContent className='h-[320px]'>
                    {analytics.topItemsByRevenue.length > 0 ? (
                      <ResponsiveContainer width='100%' height='100%'>
                        <BarChart data={analytics.topItemsByRevenue.slice(0, 8)}>
                          <CartesianGrid strokeDasharray='3 3' vertical={false} />
                          <XAxis
                            dataKey='itemName'
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis tickLine={false} axisLine={false} width={45} />
                          <Tooltip
                            formatter={(value: number | string) => [
                              formatCurrency(Number(value)),
                              'Revenue',
                            ]}
                          />
                          <Bar
                            dataKey='revenue'
                            fill='#f97316'
                            radius={[4, 4, 0, 0]}
                            maxBarSize={56}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <EmptyState text='No item revenue data found in selected range.' />
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Floor Analytics Details</CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics.floorAnalytics.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Floor</TableHead>
                          <TableHead className='text-right'>Tables</TableHead>
                          <TableHead className='text-right'>Occupied</TableHead>
                          <TableHead className='text-right'>Occupancy</TableHead>
                          <TableHead className='text-right'>Orders</TableHead>
                          <TableHead className='text-right'>Revenue</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analytics.floorAnalytics.map((row) => (
                          <TableRow key={row.floorId}>
                            <TableCell className='font-medium'>{row.floorName}</TableCell>
                            <TableCell className='text-right'>{row.totalTables}</TableCell>
                            <TableCell className='text-right'>
                              {row.occupiedTables}
                            </TableCell>
                            <TableCell className='text-right'>
                              {row.occupancyRate.toFixed(1)}%
                            </TableCell>
                            <TableCell className='text-right'>{row.ordersCount}</TableCell>
                            <TableCell className='text-right'>
                              {formatCurrency(row.paidRevenue)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <EmptyState text='No floor rows to display.' />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className='flex flex-row items-center justify-between gap-4'>
                  <CardTitle>Table Performance Leaderboard</CardTitle>
                  <Badge variant='secondary'>
                    {analytics.tableLeaderboard.length} tables
                  </Badge>
                </CardHeader>
                <CardContent>
                  {analytics.tableLeaderboard.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Table</TableHead>
                          <TableHead>Floor</TableHead>
                          <TableHead className='text-right'>Orders</TableHead>
                          <TableHead className='text-right'>Revenue</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analytics.tableLeaderboard.slice(0, 10).map((row) => (
                          <TableRow key={row.tableId}>
                            <TableCell className='font-medium'>{row.tableName}</TableCell>
                            <TableCell>{row.floorName}</TableCell>
                            <TableCell className='text-right'>{row.ordersCount}</TableCell>
                            <TableCell className='text-right'>
                              {formatCurrency(row.paidRevenue)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <EmptyState text='No table performance data in selected range.' />
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </Main>
    </>
  )
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string
  value: string | number
  icon: ReactNode
}) {
  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
        <CardTitle className='text-sm font-medium'>{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className='text-2xl font-bold'>{value}</div>
      </CardContent>
    </Card>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className='flex h-full items-center justify-center text-sm text-muted-foreground'>
      {text}
    </div>
  )
}
