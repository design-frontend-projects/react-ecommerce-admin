import { useQuery } from '@tanstack/react-query'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { AnalyticsChart } from './analytics-chart'

interface AnalyticsData {
  totalTransactions: number
  totalSaleAmount: number
  totalRefundAmount: number
  avgTransactionValue: number
  topProducts: { name: string; value: number }[]
  statusBreakdown: { name: string; value: number }[]
}

export function Analytics() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics_data'],
    queryFn: async (): Promise<AnalyticsData> => {
      // Transactions summary
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('id, transaction_type, total_amount, status')

      if (error) throw error

      const sales = (transactions || []).filter(
        (t) => t.transaction_type === 'sale'
      )
      const refunds = (transactions || []).filter(
        (t) => t.transaction_type === 'refund'
      )

      const totalSaleAmount = sales.reduce(
        (acc, t) => acc + (Number(t.total_amount) || 0),
        0
      )
      const totalRefundAmount = refunds.reduce(
        (acc, t) => acc + (Number(t.total_amount) || 0),
        0
      )
      const avgTransactionValue =
        sales.length > 0 ? totalSaleAmount / sales.length : 0

      // Status breakdown
      const statusMap: Record<string, number> = {}
      ;(transactions || []).forEach((t) => {
        const key = t.status || 'unknown'
        statusMap[key] = (statusMap[key] || 0) + 1
      })
      const statusBreakdown = Object.entries(statusMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)

      // Top selling products from transaction_details
      const { data: details, error: detailsError } = await supabase
        .from('transaction_details')
        .select(
          `
          quantity,
          subtotal,
          products ( name )
        `
        )

      if (detailsError) throw detailsError

      const productMap: Record<string, number> = {}
      ;(details || []).forEach((d: any) => {
        const name = d.products?.name || 'Unknown'
        productMap[name] = (productMap[name] || 0) + (Number(d.quantity) || 0)
      })
      const topProducts = Object.entries(productMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5)

      return {
        totalTransactions: (transactions || []).length,
        totalSaleAmount,
        totalRefundAmount,
        avgTransactionValue,
        topProducts,
        statusBreakdown,
      }
    },
  })

  return (
    <div className='space-y-4'>
      <Card>
        <CardHeader>
          <CardTitle>Sales Trend</CardTitle>
          <CardDescription>Daily transaction volume (last 7 days)</CardDescription>
        </CardHeader>
        <CardContent className='px-6'>
          <AnalyticsChart />
        </CardContent>
      </Card>
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Total Transactions
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
              <path d='M3 3v18h18' />
              <path d='M7 15l4-4 4 4 4-6' />
            </svg>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {isLoading ? '...' : analytics?.totalTransactions || 0}
            </div>
            <p className='text-xs text-muted-foreground'>
              All transaction types
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Total Sale Amount
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
              <path d='M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' />
            </svg>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              $
              {isLoading
                ? '...'
                : (analytics?.totalSaleAmount || 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
            </div>
            <p className='text-xs text-muted-foreground'>
              From sale transactions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Total Refund Amount
            </CardTitle>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth='2'
              className='h-4 w-4 text-red-500'
            >
              <polyline points='1 4 1 10 7 10' />
              <path d='M3.51 15a9 9 0 1 0 2.13-9.36L1 10' />
            </svg>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-red-500'>
              $
              {isLoading
                ? '...'
                : (analytics?.totalRefundAmount || 0).toLocaleString(
                    undefined,
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }
                  )}
            </div>
            <p className='text-xs text-muted-foreground'>
              From refund transactions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Avg. Transaction
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
              <circle cx='12' cy='12' r='10' />
              <path d='M12 6v6l4 2' />
            </svg>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              $
              {isLoading
                ? '...'
                : (analytics?.avgTransactionValue || 0).toLocaleString(
                    undefined,
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }
                  )}
            </div>
            <p className='text-xs text-muted-foreground'>
              Per sale transaction
            </p>
          </CardContent>
        </Card>
      </div>
      <div className='grid grid-cols-1 gap-4 lg:grid-cols-7'>
        <Card className='col-span-1 lg:col-span-4'>
          <CardHeader>
            <CardTitle>Top Selling Products</CardTitle>
            <CardDescription>By quantity sold</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleBarList
              items={analytics?.topProducts || []}
              barClass='bg-primary'
              valueFormatter={(n) => `${n} sold`}
            />
          </CardContent>
        </Card>
        <Card className='col-span-1 lg:col-span-3'>
          <CardHeader>
            <CardTitle>Transaction Status</CardTitle>
            <CardDescription>Breakdown by status</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleBarList
              items={analytics?.statusBreakdown || []}
              barClass='bg-muted-foreground'
              valueFormatter={(n) => `${n}`}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function SimpleBarList({
  items,
  valueFormatter,
  barClass,
}: {
  items: { name: string; value: number }[]
  valueFormatter: (n: number) => string
  barClass: string
}) {
  if (!items.length) {
    return (
      <div className='text-sm text-muted-foreground'>No data available.</div>
    )
  }

  const max = Math.max(...items.map((i) => i.value), 1)
  return (
    <ul className='space-y-3'>
      {items.map((i) => {
        const width = `${Math.round((i.value / max) * 100)}%`
        return (
          <li key={i.name} className='flex items-center justify-between gap-3'>
            <div className='min-w-0 flex-1'>
              <div className='mb-1 truncate text-xs text-muted-foreground capitalize'>
                {i.name}
              </div>
              <div className='h-2.5 w-full rounded-full bg-muted'>
                <div
                  className={`h-2.5 rounded-full ${barClass}`}
                  style={{ width }}
                />
              </div>
            </div>
            <div className='ps-2 text-xs font-medium tabular-nums'>
              {valueFormatter(i.value)}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
