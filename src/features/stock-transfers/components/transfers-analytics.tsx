import * as React from 'react'
import {
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  TrendingUp,
  Truck,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { TransferListItem } from '../data/schema'

export interface TransfersAnalyticsProps {
  transfers: TransferListItem[]
  activeStatusFilter?: string | null
  onStatusFilterChange?: (status: string | null) => void
  className?: string
}

export function TransfersAnalytics({
  transfers = [],
  activeStatusFilter,
  onStatusFilterChange,
  className,
}: TransfersAnalyticsProps) {
  const { t } = useTranslation()

  const metrics = React.useMemo(() => {
    const totalCount = transfers.length
    const draftCount = transfers.filter((t) => t.status === 'draft').length
    const approvedCount = transfers.filter(
      (t) => t.status === 'approved'
    ).length
    const pickedCount = transfers.filter((t) => t.status === 'picked').length
    const inTransitCount = transfers.filter(
      (t) => t.status === 'in_transit'
    ).length
    const receivedCount = transfers.filter(
      (t) => t.status === 'received'
    ).length
    const completedCount = transfers.filter(
      (t) => t.status === 'completed'
    ).length
    const cancelledCount = transfers.filter(
      (t) => t.status === 'cancelled'
    ).length

    const pendingActionCount = draftCount + approvedCount + pickedCount
    const successCount = receivedCount + completedCount
    const fulfillmentRate =
      totalCount - draftCount - cancelledCount > 0
        ? Math.round(
            (successCount / (totalCount - draftCount - cancelledCount)) * 100
          )
        : 100

    const totalLines = transfers.reduce(
      (acc, t) => acc + (t._count?.stock_transfer_items ?? 1),
      0
    )

    return {
      totalCount,
      draftCount,
      approvedCount,
      pickedCount,
      inTransitCount,
      receivedCount,
      completedCount,
      cancelledCount,
      pendingActionCount,
      successCount,
      fulfillmentRate,
      totalLines,
    }
  }, [transfers])

  return (
    <div className={cn('space-y-3.5', className)}>
      {/* 4 Executive KPI Cards */}
      <div className='grid grid-cols-2 gap-2.5 sm:gap-3.5 sm:grid-cols-2 lg:grid-cols-4'>
        {/* Card 1: Total Transfers */}
        <Card
          onClick={() => onStatusFilterChange?.(null)}
          className={cn(
            'cursor-pointer border bg-card/60 backdrop-blur-xs transition-all hover:border-primary/50 hover:shadow-md',
            activeStatusFilter === null &&
              'border-primary ring-1 ring-primary/30'
          )}
        >
          <CardContent className='p-4.5'>
            <div className='flex items-center justify-between'>
              <span className='text-xs font-semibold tracking-wider text-muted-foreground uppercase'>
                {t(
                  'stockTransfers.analytics.totalTransfers',
                  'Total Transfers'
                )}
              </span>
              <div className='rounded-lg bg-primary/10 p-2 text-primary'>
                <ArrowRightLeft className='h-4 w-4' />
              </div>
            </div>
            <div className='mt-2 flex items-baseline gap-2'>
              <span className='text-2xl font-black tracking-tight text-foreground'>
                {metrics.totalCount}
              </span>
              <span className='text-xs text-muted-foreground'>
                {t('stockTransfers.analytics.linesCount', {
                  count: metrics.totalLines,
                  defaultValue: `(${metrics.totalLines} lines)`,
                })}
              </span>
            </div>
            <div className='mt-2.5 flex items-center gap-1.5 text-[11px] text-muted-foreground'>
              <span className='inline-block h-2 w-2 rounded-full bg-emerald-500' />
              <span>
                {t('stockTransfers.analytics.completedCount', {
                  count: metrics.successCount,
                  defaultValue: `${metrics.successCount} Completed`,
                })}
              </span>
              <span>•</span>
              <span className='inline-block h-2 w-2 rounded-full bg-blue-500' />
              <span>
                {t('stockTransfers.analytics.activeCount', {
                  count: metrics.inTransitCount,
                  defaultValue: `${metrics.inTransitCount} Active`,
                })}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: In-Transit Active Pipeline */}
        <Card
          onClick={() => onStatusFilterChange?.('in_transit')}
          className={cn(
            'cursor-pointer border bg-card/60 backdrop-blur-xs transition-all hover:border-blue-500/50 hover:shadow-md',
            activeStatusFilter === 'in_transit' &&
              'border-blue-500 ring-1 ring-blue-500/30'
          )}
        >
          <CardContent className='p-4.5'>
            <div className='flex items-center justify-between'>
              <span className='text-xs font-semibold tracking-wider text-muted-foreground uppercase'>
                {t('stockTransfers.analytics.inTransit', 'In-Transit Freight')}
              </span>
              <div className='rounded-lg bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400'>
                <Truck className='h-4 w-4' />
              </div>
            </div>
            <div className='mt-2 flex items-baseline gap-2'>
              <span className='text-2xl font-black tracking-tight text-blue-600 dark:text-blue-400'>
                {metrics.inTransitCount}
              </span>
              <span className='text-xs text-muted-foreground'>
                {t('stockTransfers.analytics.shipmentsOnMove', {
                  count: metrics.inTransitCount,
                  defaultValue: `${metrics.inTransitCount === 1 ? 'Shipment' : 'Shipments'} on move`,
                })}
              </span>
            </div>
            <p className='mt-2.5 truncate text-[11px] text-muted-foreground'>
              {metrics.inTransitCount > 0
                ? t(
                    'stockTransfers.analytics.activeInterWarehouse',
                    'Active inter-warehouse transfers in logistics transit'
                  )
                : t(
                    'stockTransfers.analytics.allArrived',
                    'All shipments currently arrived at destination'
                  )}
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Pending Action */}
        <Card
          onClick={() => onStatusFilterChange?.('pending')}
          className={cn(
            'cursor-pointer border bg-card/60 backdrop-blur-xs transition-all hover:border-amber-500/50 hover:shadow-md',
            activeStatusFilter === 'pending' &&
              'border-amber-500 ring-1 ring-amber-500/30'
          )}
        >
          <CardContent className='p-4.5'>
            <div className='flex items-center justify-between'>
              <span className='text-xs font-semibold tracking-wider text-muted-foreground uppercase'>
                {t('stockTransfers.analytics.actionRequired', 'Pending Action')}
              </span>
              <div className='rounded-lg bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400'>
                <Clock className='h-4 w-4' />
              </div>
            </div>
            <div className='mt-2 flex items-baseline gap-2'>
              <span className='text-2xl font-black tracking-tight text-amber-600 dark:text-amber-400'>
                {metrics.pendingActionCount}
              </span>
              <span className='text-xs text-muted-foreground'>
                {t(
                  'stockTransfers.analytics.awaitingSteps',
                  'Awaiting workflow steps'
                )}
              </span>
            </div>
            <div className='mt-2.5 flex items-center gap-2 text-[11px] text-muted-foreground'>
              <span>
                {t('stockTransfers.analytics.draftsCount', {
                  count: metrics.draftCount,
                  defaultValue: `${metrics.draftCount} Drafts`,
                })}
              </span>
              <span>•</span>
              <span>
                {t('stockTransfers.analytics.approvedCount', {
                  count: metrics.approvedCount,
                  defaultValue: `${metrics.approvedCount} Approved`,
                })}
              </span>
              <span>•</span>
              <span>
                {t('stockTransfers.analytics.pickedCount', {
                  count: metrics.pickedCount,
                  defaultValue: `${metrics.pickedCount} Picked`,
                })}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Fulfillment Success Rate */}
        <Card
          onClick={() => onStatusFilterChange?.('completed')}
          className={cn(
            'cursor-pointer border bg-card/60 backdrop-blur-xs transition-all hover:border-emerald-500/50 hover:shadow-md',
            (activeStatusFilter === 'completed' ||
              activeStatusFilter === 'received') &&
              'border-emerald-500 ring-1 ring-emerald-500/30'
          )}
        >
          <CardContent className='p-4.5'>
            <div className='flex items-center justify-between'>
              <span className='text-xs font-semibold tracking-wider text-muted-foreground uppercase'>
                {t(
                  'stockTransfers.analytics.fulfillmentRate',
                  'Fulfillment Rate'
                )}
              </span>
              <div className='rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400'>
                <CheckCircle2 className='h-4 w-4' />
              </div>
            </div>
            <div className='mt-2 flex items-baseline gap-2'>
              <span className='text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400'>
                {metrics.fulfillmentRate}%
              </span>
              <span className='text-xs text-muted-foreground'>
                {t('stockTransfers.analytics.receivedCount', {
                  count: metrics.successCount,
                  defaultValue: `${metrics.successCount} Received`,
                })}
              </span>
            </div>
            <div className='mt-2.5 flex items-center gap-1.5 text-[11px] text-muted-foreground'>
              <TrendingUp className='h-3 w-3 text-emerald-500' />
              <span>
                {t('stockTransfers.analytics.cancelledRejectedCount', {
                  count: metrics.cancelledCount,
                  defaultValue: `${metrics.cancelledCount} Cancelled / Rejected`,
                })}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Filter Badges */}
      {onStatusFilterChange && (
        <div className='no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-1 text-xs'>
          <span className='mr-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase'>
            {t('common.filter', 'Filter:')}
          </span>
          <Badge
            variant={activeStatusFilter === null ? 'default' : 'outline'}
            onClick={() => onStatusFilterChange(null)}
            className='cursor-pointer px-2.5 py-1 transition-colors'
          >
            {t('stockTransfers.analytics.filterAll', {
              count: metrics.totalCount,
              defaultValue: `All (${metrics.totalCount})`,
            })}
          </Badge>
          <Badge
            variant={
              activeStatusFilter === 'in_transit' ? 'default' : 'outline'
            }
            onClick={() => onStatusFilterChange('in_transit')}
            className='cursor-pointer gap-1 border-blue-500/30 px-2.5 py-1 text-blue-600 transition-colors dark:text-blue-400'
          >
            <Truck className='h-3 w-3' />
            {t('stockTransfers.analytics.filterInTransit', {
              count: metrics.inTransitCount,
              defaultValue: `In Transit (${metrics.inTransitCount})`,
            })}
          </Badge>
          <Badge
            variant={activeStatusFilter === 'pending' ? 'default' : 'outline'}
            onClick={() => onStatusFilterChange('pending')}
            className='cursor-pointer gap-1 border-amber-500/30 px-2.5 py-1 text-amber-600 transition-colors dark:text-amber-400'
          >
            <Clock className='h-3 w-3' />
            {t('stockTransfers.analytics.filterPendingAction', {
              count: metrics.pendingActionCount,
              defaultValue: `Pending Action (${metrics.pendingActionCount})`,
            })}
          </Badge>
          <Badge
            variant={activeStatusFilter === 'completed' ? 'default' : 'outline'}
            onClick={() => onStatusFilterChange('completed')}
            className='cursor-pointer gap-1 border-emerald-500/30 px-2.5 py-1 text-emerald-600 transition-colors dark:text-emerald-400'
          >
            <CheckCircle2 className='h-3 w-3' />
            {t('stockTransfers.analytics.filterCompletedReceived', {
              count: metrics.successCount,
              defaultValue: `Completed / Received (${metrics.successCount})`,
            })}
          </Badge>
          <Badge
            variant={activeStatusFilter === 'draft' ? 'default' : 'outline'}
            onClick={() => onStatusFilterChange('draft')}
            className='cursor-pointer gap-1 px-2.5 py-1 text-muted-foreground transition-colors'
          >
            {t('stockTransfers.analytics.filterDrafts', {
              count: metrics.draftCount,
              defaultValue: `Drafts (${metrics.draftCount})`,
            })}
          </Badge>
        </div>
      )}
    </div>
  )
}
