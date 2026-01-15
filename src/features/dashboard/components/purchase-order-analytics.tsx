import { startOfMonth, subMonths, format } from 'date-fns'
import { useQuery } from '@tanstack/react-query'
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'
import { supabase } from '@/lib/supabase'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function PurchaseOrderAnalytics() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['po-analytics'],
    queryFn: async () => {
      // 1. Total Spend
      const { data: orders, error } = await supabase
        .from('purchase_orders')
        .select('total_amount, status, created_at, order_date')

      if (error) throw error

      const totalSpend = orders.reduce(
        (acc, curr) => acc + (Number(curr.total_amount) || 0),
        0
      )
      const pendingCount = orders.filter(
        (o) => o.status !== 'Received' && o.status !== 'Cancelled'
      ).length
      const receivedCount = orders.filter((o) => o.status === 'Received').length

      // 2. Spend over time (Last 6 months)
      const sixMonthsAgo = subMonths(startOfMonth(new Date()), 5)
      const monthlyData: Record<string, number> = {}

      // Initialize keys
      for (let i = 0; i < 6; i++) {
        const d = subMonths(new Date(), i)
        monthlyData[format(d, 'MMM yyyy')] = 0
      }

      orders.forEach((order) => {
        if (!order.order_date) return
        const date = new Date(order.order_date)
        if (date >= sixMonthsAgo) {
          const key = format(date, 'MMM yyyy')
          if (monthlyData[key] !== undefined) {
            monthlyData[key] += Number(order.total_amount) || 0
          }
        }
      })

      const chartData = Object.entries(monthlyData)
        .map(([name, total]) => ({ name, total }))
        .reverse() // Oldest first

      return {
        totalSpend,
        pendingCount,
        receivedCount,
        totalOrders: orders.length,
        chartData,
      }
    },
  })

  if (isLoading) return <div>Loading analytics...</div>

  return (
    <div className='space-y-4'>
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Total Spend</CardTitle>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth='2'
              className='h-4 w-4 text-muted-foreground'
            >
              <path d='M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' />
            </svg>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              ${analytics?.totalSpend.toLocaleString()}
            </div>
            <p className='text-xs text-muted-foreground'>
              Lifetime purchase volume
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Pending Orders
            </CardTitle>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth='2'
              className='h-4 w-4 text-muted-foreground'
            >
              <rect width='20' height='14' x='2' y='5' rx='2' />
              <path d='M2 10h20' />
            </svg>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{analytics?.pendingCount}</div>
            <p className='text-xs text-muted-foreground'>
              Orders waiting to be received
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Received Orders
            </CardTitle>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth='2'
              className='h-4 w-4 text-muted-foreground'
            >
              <path d='M22 11.08V12a10 10 0 1 1-5.93-9.14' />
              <polyline points='22 4 12 14.01 9 11.01' />
            </svg>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{analytics?.receivedCount}</div>
            <p className='text-xs text-muted-foreground'>
              Successfully completed orders
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className='col-span-4'>
        <CardHeader>
          <CardTitle>Spending Overview</CardTitle>
          <CardDescription>
            Monthly purchase order spending over the last 6 months
          </CardDescription>
        </CardHeader>
        <CardContent className='pl-2'>
          <ResponsiveContainer width='100%' height={350}>
            <BarChart data={analytics?.chartData}>
              <XAxis
                dataKey='name'
                stroke='#888888'
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke='#888888'
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip
                formatter={(value: any) => [
                  `$${(value || 0).toLocaleString()}`,
                  'Spend',
                ]}
                cursor={{ fill: 'transparent' }}
              />
              <Bar
                dataKey='total'
                fill='currentColor'
                radius={[4, 4, 0, 0]}
                className='fill-primary'
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
