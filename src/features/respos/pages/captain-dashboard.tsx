import { useAuth } from '@clerk/clerk-react'
import { Loader2, RefreshCw, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  type ReadyOrderItem,
  useCaptainRealtime,
  useMarkItemsServed,
  useReadyOrderItems,
} from '../api/captain-queries'
import { ReadyTableCard } from '../components/captain/ready-table-card'

export default function CaptainDashboard() {
  const { has, isLoaded, isSignedIn } = useAuth()

  // Enable realtime updates
  useCaptainRealtime()

  const { data: readyItems, isRefetching, refetch } = useReadyOrderItems()
  const { mutate: markServed } = useMarkItemsServed()

  if (!isLoaded) {
    return (
      <div className='flex h-full items-center justify-center'>
        <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
      </div>
    )
  }

  if (isLoaded && isSignedIn) {
    if (!has({ role: 'captain' }) && !has({ role: 'super_admin' })) {
      return (
        <div className='flex h-full flex-col items-center justify-center gap-4 text-center'>
          <ShieldAlert className='h-16 w-16 text-destructive' />
          <h2 className='text-2xl font-bold'>Access Denied</h2>
          <p className='text-muted-foreground'>
            You do not have permission to view this page.
          </p>
        </div>
      )
    }
  }

  // Group items by table
  const itemsByTable = (readyItems || []).reduce(
    (acc, item) => {
      const tableId = item.order.table_id || 'unknown'
      if (!acc[tableId]) {
        acc[tableId] = {
          tableNumber: item.order.table?.table_number || 'Unknown',
          items: [],
        }
      }
      acc[tableId].items.push(item)
      return acc
    },
    {} as Record<string, { tableNumber: string; items: ReadyOrderItem[] }>
  )

  return (
    <div className='flex flex-col gap-6 p-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>Captain Station</h1>
          <p className='text-muted-foreground'>
            Manage ready orders and table service
          </p>
        </div>
        <Button
          variant='outline'
          size='sm'
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`}
          />
          Refresh
        </Button>
      </div>

      {Object.keys(itemsByTable).length === 0 ? (
        <div className='flex h-[50vh] flex-col items-center justify-center rounded-lg border border-dashed text-center'>
          <h3 className='text-xl font-semibold'>All Caught Up!</h3>
          <p className='text-muted-foreground'>
            No ready orders waiting to be served.
          </p>
        </div>
      ) : (
        <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
          {Object.entries(itemsByTable)
            .sort(([, a], [, b]) => a.tableNumber.localeCompare(b.tableNumber))
            .map(([tableId, { tableNumber, items }]) => (
              <ReadyTableCard
                key={tableId}
                tableNumber={tableNumber}
                items={items}
                onMarkServed={markServed}
              />
            ))}
        </div>
      )}
    </div>
  )
}
