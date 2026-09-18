import * as React from 'react'
import {
  ShoppingCart,
  Clock,
  Truck,
  CheckCircle2,
  DollarSign,
  TrendingUp,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { type PurchaseOrder } from '../hooks/use-purchase-orders'

export interface POAnalyticsProps {
  orders: PurchaseOrder[]
  activeStatusFilter?: string | null
  onStatusFilterChange?: (status: string | null) => void
  className?: string
}

export function POAnalytics({
  orders = [],
  activeStatusFilter,
  onStatusFilterChange,
  className,
}: POAnalyticsProps) {
  const { t } = useTranslation()

  const metrics = React.useMemo(() => {
    const totalCount = orders.length
    const totalSpend = orders.reduce((sum, po) => {
      const val = Number(po.grand_total ?? po.total_amount ?? 0)
      return sum + (isNaN(val) ? 0 : val)
    }, 0)

    const draftOrPendingCount = orders.filter((o) => {
      const st = String(o.lifecycle_status ?? o.status).toLowerCase()
      return ['draft', 'pending', 'approved'].includes(st)
    }).length

    const inboundOrPartialCount = orders.filter((o) => {
      const st = String(o.lifecycle_status ?? o.status).toLowerCase()
      return ['sent', 'partial', 'partially_received'].includes(st)
    }).length

    const receivedCount = orders.filter((o) => {
      const st = String(o.lifecycle_status ?? o.status).toLowerCase()
      return ['received', 'closed'].includes(st)
    }).length

    const cancelledCount = orders.filter((o) => {
      const st = String(o.lifecycle_status ?? o.status).toLowerCase()
      return st === 'cancelled'
    }).length

    const actionableOrders = totalCount - cancelledCount
    const fulfillmentRate =
      actionableOrders > 0
        ? Math.round((receivedCount / actionableOrders) * 100)
        : 100

    return {
      totalCount,
      totalSpend,
      draftOrPendingCount,
      inboundOrPartialCount,
      receivedCount,
      cancelledCount,
      fulfillmentRate,
    }
  }, [orders])

  return (
    <div className={cn('space-y-3', className)}>
      <div className='grid grid-cols-2 gap-2.5 sm:gap-3.5 lg:grid-cols-4'>
        {/* 1. Total Orders */}
        <Card
          onClick={() => onStatusFilterChange?.('all')}
          className={cn(
            'cursor-pointer border bg-card/60 backdrop-blur-xs transition-all hover:border-primary/50 hover:shadow-md select-none',
            (activeStatusFilter === 'all' || !activeStatusFilter) &&
              'border-primary ring-1 ring-primary/30'
          )}
        >
          <CardContent className='p-3.5 sm:p-4'>
            <div className='flex items-center justify-between'>
              <span className='text-[11px] sm:text-xs font-semibold tracking-wider text-muted-foreground uppercase'>
                {t('purchaseOrders.analytics.totalOrders', 'Total Orders')}
              </span>
              <div className='rounded-lg bg-primary/10 p-1.5 text-primary'>
                <ShoppingCart className='h-4 w-4' />
              </div>
            </div>
            <div className='mt-2 flex items-baseline justify-between'>
              <span className='text-xl sm:text-2xl font-bold tracking-tight text-foreground'>
                {metrics.totalCount}
              </span>
              <span className='text-xs font-medium text-muted-foreground flex items-center gap-0.5'>
                <DollarSign className='h-3 w-3 inline text-emerald-500' />
                ${metrics.totalSpend.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
            <p className='mt-1 text-[11px] text-muted-foreground truncate'>
              {t('purchaseOrders.analytics.allActiveOrders', 'All created replenishment orders')}
            </p>
          </CardContent>
        </Card>

        {/* 2. Pending / Draft */}
        <Card
          onClick={() => onStatusFilterChange?.('pending')}
          className={cn(
            'cursor-pointer border bg-card/60 backdrop-blur-xs transition-all hover:border-amber-500/50 hover:shadow-md select-none',
            activeStatusFilter === 'pending' &&
              'border-amber-500 ring-1 ring-amber-500/30'
          )}
        >
          <CardContent className='p-3.5 sm:p-4'>
            <div className='flex items-center justify-between'>
              <span className='text-[11px] sm:text-xs font-semibold tracking-wider text-muted-foreground uppercase'>
                {t('purchaseOrders.analytics.pendingApproval', 'Pending / Draft')}
              </span>
              <div className='rounded-lg bg-amber-500/10 p-1.5 text-amber-600 dark:text-amber-400'>
                <Clock className='h-4 w-4' />
              </div>
            </div>
            <div className='mt-2 flex items-baseline justify-between'>
              <span className='text-xl sm:text-2xl font-bold tracking-tight text-amber-700 dark:text-amber-400'>
                {metrics.draftOrPendingCount}
              </span>
              <span className='text-xs font-medium text-amber-600/90 dark:text-amber-400/90'>
                {t('purchaseOrders.analytics.needsAction', 'Needs Action')}
              </span>
            </div>
            <p className='mt-1 text-[11px] text-muted-foreground truncate'>
              {t('purchaseOrders.analytics.awaitingApproval', 'Awaiting approval or dispatch')}
            </p>
          </CardContent>
        </Card>

        {/* 3. Inbound / Partial */}
        <Card
          onClick={() => onStatusFilterChange?.('partial')}
          className={cn(
            'cursor-pointer border bg-card/60 backdrop-blur-xs transition-all hover:border-sky-500/50 hover:shadow-md select-none',
            activeStatusFilter === 'partial' &&
              'border-sky-500 ring-1 ring-sky-500/30'
          )}
        >
          <CardContent className='p-3.5 sm:p-4'>
            <div className='flex items-center justify-between'>
              <span className='text-[11px] sm:text-xs font-semibold tracking-wider text-muted-foreground uppercase'>
                {t('purchaseOrders.analytics.inboundActive', 'Inbound / Partial')}
              </span>
              <div className='rounded-lg bg-sky-500/10 p-1.5 text-sky-600 dark:text-sky-400'>
                <Truck className='h-4 w-4' />
              </div>
            </div>
            <div className='mt-2 flex items-baseline justify-between'>
              <span className='text-xl sm:text-2xl font-bold tracking-tight text-sky-700 dark:text-sky-400'>
                {metrics.inboundOrPartialCount}
              </span>
              <span className='text-xs font-medium text-sky-600/90 dark:text-sky-400/90'>
                {t('purchaseOrders.analytics.inTransit', 'In Transit')}
              </span>
            </div>
            <p className='mt-1 text-[11px] text-muted-foreground truncate'>
              {t('purchaseOrders.analytics.shipmentsReceiving', 'Active shipments awaiting check-in')}
            </p>
          </CardContent>
        </Card>

        {/* 4. Completed / Received */}
        <Card
          onClick={() => onStatusFilterChange?.('received')}
          className={cn(
            'cursor-pointer border bg-card/60 backdrop-blur-xs transition-all hover:border-emerald-500/50 hover:shadow-md select-none',
            activeStatusFilter === 'received' &&
              'border-emerald-500 ring-1 ring-emerald-500/30'
          )}
        >
          <CardContent className='p-3.5 sm:p-4'>
            <div className='flex items-center justify-between'>
              <span className='text-[11px] sm:text-xs font-semibold tracking-wider text-muted-foreground uppercase'>
                {t('purchaseOrders.analytics.fulfilled', 'Fulfilled')}
              </span>
              <div className='rounded-lg bg-emerald-500/10 p-1.5 text-emerald-600 dark:text-emerald-400'>
                <CheckCircle2 className='h-4 w-4' />
              </div>
            </div>
            <div className='mt-2 flex items-baseline justify-between'>
              <span className='text-xl sm:text-2xl font-bold tracking-tight text-emerald-700 dark:text-emerald-400'>
                {metrics.receivedCount}
              </span>
              <span className='text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5'>
                <TrendingUp className='h-3 w-3 inline' />
                {metrics.fulfillmentRate}%
              </span>
            </div>
            <p className='mt-1 text-[11px] text-muted-foreground truncate'>
              {t('purchaseOrders.analytics.inventoryStocked', 'Stock received into inventory')}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
