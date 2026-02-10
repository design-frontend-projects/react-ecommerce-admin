// ResPOS Kitchen Display - Order Queue for Kitchen Staff
import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { ChefHat, Clock, Loader2, Volume2, VolumeX } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { useUpdateOrderItemStatus } from '../api/mutations'
import { useOrders } from '../api/queries'
import { useKitchenRealtime } from '../hooks'
import type { ResOrder, ResOrderItem, ResTable, ResMenuItem } from '../types'

type KitchenOrder = ResOrder & {
  table: ResTable
  order_items: Array<ResOrderItem & { menu_item: ResMenuItem }>
}

export function KitchenDisplay() {
  const [soundEnabled, setSoundEnabled] = useState(true)
  const { data: orders, isLoading } = useOrders()
  const updateItemStatus = useUpdateOrderItemStatus()

  // Realtime subscription for kitchen
  useKitchenRealtime(() => {
    if (soundEnabled) {
      // Play notification sound
      const audio = new Audio('/sounds/new-order.mp3')
      audio.play().catch(() => {})
    }
  })

  // Filter orders that have pending/preparing items
  const activeOrders =
    orders?.filter(
      (order) =>
        ['open', 'in_progress'].includes(order.status) &&
        order.order_items?.some((item) =>
          ['pending', 'preparing'].includes(item.status)
        )
    ) ?? []

  // Group by status
  const pendingOrders = activeOrders.filter((order) =>
    order.order_items?.some((item) => item.status === 'pending')
  )
  const preparingOrders = activeOrders.filter(
    (order) =>
      order.order_items?.every((item) => item.status !== 'pending') &&
      order.order_items?.some((item) => item.status === 'preparing')
  )
  const readyOrders =
    orders
      ?.filter((order) =>
        order.order_items?.every((item) => item.status === 'ready')
      )
      .slice(0, 5) ?? []

  const handleStartPreparing = (_orderId: string, itemId: string) => {
    updateItemStatus.mutate({ itemId, status: 'preparing' })
  }

  const handleMarkReady = (_orderId: string, itemId: string) => {
    updateItemStatus.mutate({ itemId, status: 'ready' })
  }

  return (
    <>
      <Header className='bg-zinc-900 text-white'>
        <div className='flex items-center gap-2'>
          <ChefHat className='h-6 w-6 text-orange-500' />
          <h1 className='text-xl font-bold'>Kitchen Display</h1>
        </div>
        <div className='ml-auto flex items-center gap-4'>
          <div className='font-mono text-lg'>
            {new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
          <Button
            variant='ghost'
            size='icon'
            onClick={() => setSoundEnabled(!soundEnabled)}
          >
            {soundEnabled ? (
              <Volume2 className='h-5 w-5' />
            ) : (
              <VolumeX className='h-5 w-5' />
            )}
          </Button>
        </div>
      </Header>

      <Main className='bg-zinc-950 p-4'>
        {isLoading ? (
          <div className='flex h-[50vh] items-center justify-center'>
            <Loader2 className='h-8 w-8 animate-spin text-white' />
          </div>
        ) : (
          <div className='grid h-[calc(100vh-5rem)] grid-cols-3 gap-4'>
            {/* New Orders Column */}
            <KitchenColumn
              title='New Orders'
              count={pendingOrders.length}
              color='border-red-500'
              orders={pendingOrders}
              onItemAction={(orderId, itemId) =>
                handleStartPreparing(orderId, itemId)
              }
              actionLabel='Start'
              itemStatusFilter='pending'
            />

            {/* Preparing Column */}
            <KitchenColumn
              title='Preparing'
              count={preparingOrders.length}
              color='border-yellow-500'
              orders={preparingOrders}
              onItemAction={(orderId, itemId) =>
                handleMarkReady(orderId, itemId)
              }
              actionLabel='Ready'
              itemStatusFilter='preparing'
            />

            {/* Ready Column */}
            <KitchenColumn
              title='Ready to Serve'
              count={readyOrders.length}
              color='border-green-500'
              orders={readyOrders}
              itemStatusFilter='ready'
            />
          </div>
        )}
      </Main>
    </>
  )
}

// Kitchen Column Component
interface KitchenColumnProps {
  title: string
  count: number
  color: string
  orders: KitchenOrder[]
  onItemAction?: (orderId: string, itemId: string) => void
  actionLabel?: string
  itemStatusFilter: string
}

function KitchenColumn({
  title,
  count,
  color,
  orders,
  onItemAction,
  actionLabel,
  itemStatusFilter,
}: KitchenColumnProps) {
  return (
    <div className={cn('flex flex-col rounded-lg border-2 bg-zinc-900', color)}>
      <div className='flex items-center justify-between border-b border-zinc-800 p-3'>
        <h2 className='text-lg font-bold text-white'>{title}</h2>
        <Badge variant='secondary' className='text-lg'>
          {count}
        </Badge>
      </div>
      <div className='flex-1 space-y-3 overflow-auto p-3'>
        <AnimatePresence mode='popLayout'>
          {orders.map((order) => (
            <KitchenTicket
              key={order.id}
              order={order}
              onItemAction={onItemAction}
              actionLabel={actionLabel}
              itemStatusFilter={itemStatusFilter}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

// Kitchen Ticket Component
interface KitchenTicketProps {
  order: KitchenOrder
  onItemAction?: (orderId: string, itemId: string) => void
  actionLabel?: string
  itemStatusFilter: string
}

function KitchenTicket({
  order,
  onItemAction,
  actionLabel,
  itemStatusFilter,
}: KitchenTicketProps) {
  const filteredItems =
    order.order_items?.filter(
      (item: ResOrderItem) => item.status === itemStatusFilter
    ) ?? []

  const elapsedTime = formatDistanceToNow(new Date(order.created_at), {
    addSuffix: false,
  })

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
    >
      <Card className='border-zinc-700 bg-zinc-800'>
        <CardHeader className='pb-2'>
          <div className='flex items-center justify-between'>
            <CardTitle className='text-white'>#{order.order_number}</CardTitle>
            <div className='flex items-center gap-1 text-sm text-zinc-400'>
              <Clock className='h-4 w-4' />
              {elapsedTime}
            </div>
          </div>
          {order.table && (
            <Badge variant='outline' className='w-fit'>
              Table {order.table.table_number}
            </Badge>
          )}
        </CardHeader>
        <CardContent className='space-y-2'>
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className='flex items-start justify-between rounded bg-zinc-900 p-2'
            >
              <div>
                <p className='font-medium text-white'>
                  {item.quantity}x {item.menu_item?.name ?? 'Unknown Item'}
                </p>
                {item.notes && (
                  <p className='text-sm text-yellow-400'>Note: {item.notes}</p>
                )}
              </div>
              {onItemAction && actionLabel && (
                <Button
                  size='sm'
                  onClick={() => onItemAction(order.id, item.id)}
                >
                  {actionLabel}
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </motion.div>
  )
}
