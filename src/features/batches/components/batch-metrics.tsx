import { useTranslation } from 'react-i18next'
import {
  Boxes,
  ClockAlert,
  ShieldAlert,
  Coins,
  CheckCircle2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useFormatters } from '@/lib/formatters'
import type { BatchListItem } from '../data/schema'

export function BatchMetrics({ batches }: { batches: BatchListItem[] }) {
  const { t } = useTranslation()
  const { formatCurrency } = useFormatters()

  const totalBatches = batches.length
  const activeBatches = batches.filter((b) => b.status === 'active').length
  const expiringSoonCount = batches.filter(
    (b) => b.expiry_urgency === 'critical' || b.expiry_urgency === 'warning'
  ).length
  const expiredCount = batches.filter((b) => b.status === 'expired').length
  const blockedCount = batches.filter((b) => b.status === 'blocked').length

  const totalUnits = batches.reduce((acc, b) => acc + (b.qty_on_hand || 0), 0)
  const reservedUnits = batches.reduce((acc, b) => acc + (b.qty_reserved || 0), 0)
  const availableUnits = Math.max(0, totalUnits - reservedUnits)

  const totalValuation = batches.reduce(
    (acc, b) => acc + (b.total_value ?? (b.qty_on_hand || 0) * (b.unit_cost || 0)),
    0
  )

  return (
    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
      <Card className='relative overflow-hidden border-border/60 shadow-xs transition-all duration-200 hover:shadow-md'>
        <div className='absolute top-0 start-0 h-1 w-full bg-linear-to-r from-blue-500 to-indigo-500' />
        <CardHeader className='flex flex-row items-center justify-between pb-2 space-y-0'>
          <CardTitle className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
            {t('batches.metrics.totalBatches', 'Total Batches')}
          </CardTitle>
          <div className='rounded-md bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400'>
            <Boxes className='h-4 w-4' />
          </div>
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold tracking-tight'>{totalBatches}</div>
          <div className='mt-2 flex items-center gap-1.5 text-xs text-muted-foreground'>
            <CheckCircle2 className='h-3.5 w-3.5 text-emerald-500' />
            <span>
              <strong className='text-foreground'>{activeBatches}</strong>{' '}
              {t('batches.metrics.activeLots', 'Active Lots')}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className='relative overflow-hidden border-border/60 shadow-xs transition-all duration-200 hover:shadow-md'>
        <div className='absolute top-0 start-0 h-1 w-full bg-linear-to-r from-amber-500 to-orange-500' />
        <CardHeader className='flex flex-row items-center justify-between pb-2 space-y-0'>
          <CardTitle className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
            {t('batches.metrics.expiringSoon', 'Expiring Soon (< 30d)')}
          </CardTitle>
          <div className='rounded-md bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400'>
            <ClockAlert className='h-4 w-4' />
          </div>
        </CardHeader>
        <CardContent>
          <div className='flex items-baseline justify-between'>
            <div className='text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400'>
              {expiringSoonCount}
            </div>
            {expiringSoonCount > 0 ? (
              <Badge variant='outline' className='border-amber-500/30 text-amber-600 dark:text-amber-400'>
                {t('batches.columns.expiresSoon', 'Expires soon')}
              </Badge>
            ) : null}
          </div>
          <div className='mt-2 text-xs text-muted-foreground'>
            {t('batches.columns.critical', 'Lots needing prompt stock rotation')}
          </div>
        </CardContent>
      </Card>

      <Card className='relative overflow-hidden border-border/60 shadow-xs transition-all duration-200 hover:shadow-md'>
        <div className='absolute top-0 start-0 h-1 w-full bg-linear-to-r from-rose-500 to-red-600' />
        <CardHeader className='flex flex-row items-center justify-between pb-2 space-y-0'>
          <CardTitle className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
            {t('batches.metrics.expiredBlocked', 'Expired / Blocked')}
          </CardTitle>
          <div className='rounded-md bg-rose-500/10 p-2 text-rose-600 dark:text-rose-400'>
            <ShieldAlert className='h-4 w-4' />
          </div>
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400'>
            {expiredCount + blockedCount}
          </div>
          <div className='mt-2 flex items-center gap-2 text-xs text-muted-foreground'>
            <span className='inline-flex items-center text-rose-500'>
              {expiredCount} {t('batches.status.expired', 'Expired')}
            </span>
            <span>•</span>
            <span className='inline-flex items-center text-slate-500'>
              {blockedCount} {t('batches.status.blocked', 'Blocked')}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className='relative overflow-hidden border-border/60 shadow-xs transition-all duration-200 hover:shadow-md'>
        <div className='absolute top-0 start-0 h-1 w-full bg-linear-to-r from-emerald-500 to-teal-500' />
        <CardHeader className='flex flex-row items-center justify-between pb-2 space-y-0'>
          <CardTitle className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
            {t('batches.metrics.totalValuation', 'Lot Inventory Value')}
          </CardTitle>
          <div className='rounded-md bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400'>
            <Coins className='h-4 w-4' />
          </div>
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400'>
            {formatCurrency(totalValuation)}
          </div>
          <div className='mt-2 flex items-center justify-between text-xs text-muted-foreground'>
            <span>
              <strong className='text-foreground'>{availableUnits.toLocaleString()}</strong>{' '}
              {t('batches.metrics.available', 'available')}
            </span>
            <span>
              <strong className='text-foreground'>{reservedUnits.toLocaleString()}</strong>{' '}
              {t('batches.metrics.reserved', 'reserved')}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
