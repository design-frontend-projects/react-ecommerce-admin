import { useQuery } from '@tanstack/react-query'
import { Trophy } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getTopSellers } from '../data/dashboard-api'

export function TopSellersWidget() {
  const { data: sellers, isLoading } = useQuery({
    queryKey: ['top-sellers'],
    queryFn: getTopSellers,
    refetchInterval: 60000,
  })

  if (isLoading) return <div>Loading...</div>

  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-md flex items-center gap-2 font-medium'>
          <Trophy className='h-4 w-4 text-yellow-500' />
          Top Sellers Today
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className='space-y-4'>
          {sellers?.map((item) => (
            <div key={item.id} className='flex items-center justify-between'>
              <div className='mr-4 truncate text-sm'>{item.name}</div>
              <div className='text-sm font-bold'>{item.quantity} units</div>
            </div>
          ))}
          {sellers?.length === 0 && (
            <div className='py-4 text-center text-sm text-muted-foreground'>
              No sales yet today.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
