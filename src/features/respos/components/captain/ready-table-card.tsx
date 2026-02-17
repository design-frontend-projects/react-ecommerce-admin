import { formatDistanceToNow } from 'date-fns'
import { CheckCheck, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ReadyOrderItem } from '../../api/captain-queries'

interface ReadyTableCardProps {
  tableNumber: string
  items: ReadyOrderItem[]
  onMarkServed: (itemIds: string[]) => void
}

export function ReadyTableCard({
  tableNumber,
  items,
  onMarkServed,
}: ReadyTableCardProps) {
  // Sort items by updated_at to show oldest ready items at the top
  const sortedItems = [...items].sort(
    (a, b) =>
      new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
  )

  const handleServeAll = () => {
    onMarkServed(items.map((i) => i.id))
  }

  return (
    <Card className='overflow-hidden border-l-4 border-l-green-500 shadow-md transition-all hover:shadow-lg'>
      <CardHeader className='flex flex-row items-center justify-between bg-muted/40 pb-2'>
        <CardTitle className='text-lg font-bold'>Table {tableNumber}</CardTitle>
        <Badge
          variant='outline'
          className='bg-green-100 text-green-800 hover:bg-green-100'
        >
          {items.length} Ready Item{items.length !== 1 ? 's' : ''}
        </Badge>
      </CardHeader>
      <CardContent className='p-4'>
        <div className='space-y-4'>
          <ul className='space-y-3'>
            {sortedItems.map((item) => (
              <li
                key={item.id}
                className='flex items-start justify-between gap-2 border-b pb-2 last:border-0 last:pb-0'
              >
                <div className='flex flex-col'>
                  <span className='font-medium text-foreground'>
                    {item.quantity}x {item.menu_item?.name || 'Unknown Item'}
                  </span>
                  {item.notes && (
                    <span className='text-xs text-muted-foreground italic'>
                      Note: {item.notes}
                    </span>
                  )}
                  <div className='mt-1 flex items-center text-xs text-muted-foreground'>
                    <Clock className='mr-1 h-3 w-3' />
                    Ready{' '}
                    {formatDistanceToNow(new Date(item.updated_at), {
                      addSuffix: true,
                    })}
                  </div>
                </div>
                <Button
                  size='sm'
                  variant='ghost'
                  className='h-8 w-8 p-0 text-green-600 hover:bg-green-50 hover:text-green-700'
                  onClick={() => onMarkServed([item.id])}
                  title='Mark as Served'
                >
                  <CheckCheck className='h-4 w-4' />
                </Button>
              </li>
            ))}
          </ul>

          <Button
            className='w-full bg-green-600 text-white hover:bg-green-700'
            onClick={handleServeAll}
          >
            Mark All Served
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
