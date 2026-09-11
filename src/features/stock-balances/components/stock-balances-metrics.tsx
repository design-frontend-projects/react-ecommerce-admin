import { useTranslation } from 'react-i18next'
import {
  Boxes,
  PackageCheck,
  Clock,
  CircleDollarSign,
  AlertTriangle,
  Layers,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { StockMetrics } from '../data/schema'

interface Props {
  metrics?: StockMetrics
  isLoading?: boolean
}

export function StockBalancesMetrics({ metrics }: Props) {
  const { t } = useTranslation()
  const totalVariants = metrics?.totalVariants ?? 0
  const totalOnHand = metrics?.totalOnHand ?? 0
  const totalReserved = metrics?.totalReserved ?? 0
  const totalAvailable = metrics?.totalAvailable ?? 0
  const totalValuation = metrics?.totalValuation ?? 0
  const lowStockCount = metrics?.lowStockCount ?? 0
  const outOfStockCount = metrics?.outOfStockCount ?? 0

  const availablePercent =
    totalOnHand > 0 ? Math.round((totalAvailable / totalOnHand) * 100) : 100

  return (
    <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6'>
      {/* 1. Tracked Variants */}
      <Card className='shadow-2xs border-border/60 py-3'>
        <CardContent className='p-3'>
          <div className='flex items-center justify-between'>
            <span className='text-xs font-medium text-muted-foreground'>
              {t('stockBalances.metrics.trackedSkus', 'Tracked SKUs')}
            </span>
            <Boxes className='h-4 w-4 text-primary/70' />
          </div>
          <div className='mt-1.5'>
            <span className='font-mono text-xl font-bold tracking-tight'>
              {totalVariants.toLocaleString()}
            </span>
            <p className='text-[11px] text-muted-foreground'>
              {t('stockBalances.metrics.uniqueVariants', 'Unique variants')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 2. On Hand */}
      <Card className='shadow-2xs border-border/60 py-3'>
        <CardContent className='p-3'>
          <div className='flex items-center justify-between'>
            <span className='text-xs font-medium text-muted-foreground'>
              {t('stockBalances.metrics.onHandUnits', 'On Hand Units')}
            </span>
            <Layers className='h-4 w-4 text-primary/70' />
          </div>
          <div className='mt-1.5'>
            <span className='font-mono text-xl font-bold tracking-tight'>
              {totalOnHand.toLocaleString()}
            </span>
            <p className='text-[11px] text-muted-foreground'>
              {t('stockBalances.metrics.physicalQuantity', 'Physical quantity')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 3. Reserved */}
      <Card className='shadow-2xs border-border/60 py-3'>
        <CardContent className='p-3'>
          <div className='flex items-center justify-between'>
            <span className='text-xs font-medium text-muted-foreground'>
              {t('stockBalances.metrics.reserved', 'Reserved')}
            </span>
            <Clock className='h-4 w-4 text-amber-500/80' />
          </div>
          <div className='mt-1.5'>
            <span className='font-mono text-xl font-bold tracking-tight text-amber-600 dark:text-amber-400'>
              {totalReserved.toLocaleString()}
            </span>
            <p className='text-[11px] text-muted-foreground'>
              {t('stockBalances.metrics.committedToOrders', 'Committed to orders')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 4. Available */}
      <Card className='shadow-2xs border-border/60 py-3'>
        <CardContent className='p-3'>
          <div className='flex items-center justify-between'>
            <span className='text-xs font-medium text-muted-foreground'>
              {t('stockBalances.metrics.available', 'Available')}
            </span>
            <PackageCheck className='h-4 w-4 text-emerald-500/80' />
          </div>
          <div className='mt-1.5'>
            <span className='font-mono text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400'>
              {totalAvailable.toLocaleString()}
            </span>
            <p className='text-[11px] text-muted-foreground'>
              {t('stockBalances.metrics.availablePercent', {
                percent: availablePercent,
                defaultValue: '{{percent}}% of physical stock',
              })}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 5. Inventory Valuation */}
      <Card className='shadow-2xs border-border/60 py-3'>
        <CardContent className='p-3'>
          <div className='flex items-center justify-between'>
            <span className='text-xs font-medium text-muted-foreground'>
              {t('stockBalances.metrics.valuation', 'Valuation')}
            </span>
            <CircleDollarSign className='h-4 w-4 text-primary/70' />
          </div>
          <div className='mt-1.5'>
            <span className='font-mono text-xl font-bold tracking-tight text-foreground'>
              ${totalValuation.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
            <p className='text-[11px] text-muted-foreground'>
              {t('stockBalances.metrics.movingAvgCost', 'Moving avg cost')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 6. Alerts */}
      <Card className='shadow-2xs border-border/60 py-3'>
        <CardContent className='p-3'>
          <div className='flex items-center justify-between'>
            <span className='text-xs font-medium text-muted-foreground'>
              {t('stockBalances.metrics.stockAlerts', 'Stock Alerts')}
            </span>
            <AlertTriangle className='h-4 w-4 text-destructive/80' />
          </div>
          <div className='mt-1.5 flex items-baseline gap-2'>
            <span className='font-mono text-xl font-bold tracking-tight text-destructive'>
              {outOfStockCount + lowStockCount}
            </span>
            <span className='text-[11px] text-muted-foreground'>
              {t('stockBalances.metrics.alertsSummary', {
                outOfStock: outOfStockCount,
                lowStock: lowStockCount,
                defaultValue: '({{outOfStock}} OOS, {{lowStock}} Low)',
              })}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
