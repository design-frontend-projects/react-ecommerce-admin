import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LowStockWidget } from './low-stock-widget'
import { SalesSummaryWidget } from './sales-summary-widget'
import { TopSellersWidget } from './top-sellers-widget'

export function ShiftDashboard() {
  const { data: recentOrders } = useQuery({
    queryKey: ['recent-pos-transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)
      if (error) throw error
      return data
    },
  })

  return (
    <div className='space-y-6 p-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-3xl font-bold tracking-tight'>Shift Dashboard</h1>
        <div className='flex items-center gap-2 text-sm text-muted-foreground'>
          Updates every minute automatically.
        </div>
      </div>

      <SalesSummaryWidget />

      <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
        <TopSellersWidget />
        <LowStockWidget />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className='text-md font-medium'>
            Recent Activity Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='relative w-full overflow-auto'>
            <table className='w-full caption-bottom text-sm'>
              <thead className='[&_tr]:border-b'>
                <tr className='border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted'>
                  <th className='h-12 px-4 text-left align-middle font-medium text-muted-foreground'>
                    Order #
                  </th>
                  <th className='h-12 px-4 text-left align-middle font-medium text-muted-foreground'>
                    Time
                  </th>
                  <th className='h-12 px-4 text-left align-middle font-medium text-muted-foreground'>
                    Type
                  </th>
                  <th className='h-12 px-4 text-right align-middle font-medium text-muted-foreground'>
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className='[&_tr:last-child]:border-0'>
                {recentOrders?.map((order) => (
                  <tr
                    key={order.id}
                    className='border-b transition-colors hover:bg-muted/50'
                  >
                    <td className='p-4 align-middle font-medium'>
                      {order.transaction_number}
                    </td>
                    <td className='p-4 align-middle text-muted-foreground'>
                      {new Date(order.created_at).toLocaleTimeString()}
                    </td>
                    <td className='p-4 align-middle capitalize'>
                      {order.transaction_type}
                    </td>
                    <td className='p-4 text-right align-middle font-bold'>
                      {formatCurrency(Number(order.total_amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
