import { useQuery } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getLowStock } from '../data/dashboard-api'

export function LowStockWidget() {
  const { data: stock, isLoading } = useQuery({
    queryKey: ['low-stock'],
    queryFn: getLowStock,
    refetchInterval: 300000, // 5 min
  })

  if (isLoading) return <div>Loading...</div>

  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-md flex items-center gap-2 font-medium'>
          <AlertTriangle className='h-4 w-4 text-destructive' />
          Low Stock Alerts
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className='space-y-4'>
          {stock?.map((item) => (
            <div
              key={item.product_id}
              className='flex items-center justify-between'
            >
              <div className='min-w-0 flex-1'>
                <div className='truncate text-sm font-medium'>
                  {(item.products as unknown as { name: string })?.name}
                </div>
                <div className='text-xs text-muted-foreground'>
                  {(item.products as unknown as { sku: string })?.sku}
                </div>
              </div>
              <div
                className={`text-sm font-bold ${item.quantity < 5 ? 'text-destructive' : 'text-orange-500'}`}
              >
                {item.quantity} left
              </div>
            </div>
          ))}
          {stock?.length === 0 && (
            <div className='py-4 text-center text-sm text-muted-foreground'>
              All items are well stocked.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
