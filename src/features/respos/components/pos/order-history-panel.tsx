import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { FileClock, Search, AlertCircle, RefreshCw } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useOrders } from '../../api/queries'
import { formatCurrency } from '../../lib/formatters'
import { RefundDialog } from './refund-dialog'

export function OrderHistoryPanel({ onClose: _onClose }: { onClose?: () => void }) {
  const { data: orders, isLoading, isError } = useOrders()
  const [searchTerm, setSearchTerm] = useState('')

  const filteredOrders = orders?.filter((order) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      order.order_number.toLowerCase().includes(searchLower) ||
      order.customer_name?.toLowerCase().includes(searchLower) ||
      order.status.toLowerCase().includes(searchLower)
    )
  })

  return (
    <div className='flex h-full flex-col'>
      {/* Header */}
      <div className='flex items-center justify-between border-b p-4'>
        <div>
          <h2 className='text-lg font-black tracking-tighter'>Order History</h2>
          <p className='text-xs font-medium text-muted-foreground'>
            Recent transactions & refunds
          </p>
        </div>
      </div>

      {/* Search */}
      <div className='p-4 pb-2'>
        <div className='relative'>
          <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            placeholder='Search Order #, Customer, or Status'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className='h-10 rounded-xl bg-muted/50 pl-9 font-medium shadow-none outline-none focus-visible:ring-1 focus-visible:ring-orange-500'
          />
        </div>
      </div>

      {/* Order List */}
      <ScrollArea className='flex-1'>
        <div className='space-y-3 p-4'>
          {isLoading ? (
            <div className='flex items-center justify-center py-20'>
              <RefreshCw className='h-6 w-6 animate-spin text-muted-foreground opacity-50' />
            </div>
          ) : isError ? (
            <div className='flex items-center justify-center py-20 text-red-500'>
              <AlertCircle className='h-6 w-6' />
            </div>
          ) : filteredOrders?.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-20 text-center opacity-40'>
              <FileClock className='mb-4 h-12 w-12 stroke-[1.5]' />
              <p className='text-xs font-black tracking-widest uppercase'>
                No completed orders
              </p>
            </div>
          ) : (
            <AnimatePresence>
              {filteredOrders?.map((order) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className='group relative flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm transition-all hover:border-primary/50'
                >
                  <div className='flex items-start justify-between'>
                    <div>
                      <div className='flex items-center gap-2'>
                        <span className='font-mono font-bold'>
                          {order.order_number}
                        </span>
                        <OrderBadge status={order.status} />
                      </div>
                      <p className='mt-1 text-xs text-muted-foreground'>
                        {format(new Date(order.created_at), 'MMM d, p')}
                        {order.customer_name && ` • ${order.customer_name}`}
                      </p>
                    </div>
                    <div className='text-right'>
                      <p className='font-black tracking-tight'>
                        {formatCurrency(order.total_amount)}
                      </p>
                      {order.subtotal !== order.total_amount && (
                        <p className='text-[10px] font-medium text-emerald-600'>
                          Discounted
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action row */}
                  {order.status === 'paid' && (
                    <div className='mt-2 flex justify-end'>
                      <RefundDialog order={order} />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

function OrderBadge({ status }: { status: string }) {
  switch (status) {
    case 'open':
    case 'in_progress':
      return <Badge variant='secondary'>Active</Badge>
    case 'ready':
      return <Badge className='bg-blue-500'>Ready</Badge>
    case 'paid':
      return <Badge className='bg-emerald-500'>Paid</Badge>
    case 'void':
      return <Badge variant='destructive'>Void</Badge>
    case 'refunded':
      return (
        <Badge variant='destructive' className='bg-orange-500'>
          Refunded
        </Badge>
      )
    default:
      return <Badge variant='outline'>{status}</Badge>
  }
}
