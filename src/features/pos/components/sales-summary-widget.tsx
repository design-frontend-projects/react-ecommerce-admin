import { useQuery } from '@tanstack/react-query'
import { DollarSign, ShoppingCart, TrendingUp } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getShiftMetrics } from '../data/dashboard-api'

export function SalesSummaryWidget() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['shift-metrics'],
    queryFn: getShiftMetrics,
    refetchInterval: 30000, // Refresh every 30s
  })

  if (isLoading) return <div>Loading metrics...</div>

  return (
    <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
      <Card>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium'>Sales Today</CardTitle>
          <DollarSign className='h-4 w-4 text-muted-foreground' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold'>
            {formatCurrency(metrics?.salesToday)}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium'>Order Count</CardTitle>
          <ShoppingCart className='h-4 w-4 text-muted-foreground' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold'>{metrics?.countToday}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium'>Avg Order Value</CardTitle>
          <TrendingUp className='h-4 w-4 text-muted-foreground' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold'>
            {formatCurrency(metrics?.averageOrderValue)}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
