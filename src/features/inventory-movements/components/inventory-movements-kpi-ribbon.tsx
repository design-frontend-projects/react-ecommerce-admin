import { useTranslation } from 'react-i18next'
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { MovementSummaryStats } from '../data/schema'

export interface InventoryMovementsKpiRibbonProps {
  summary?: MovementSummaryStats
  isLoading?: boolean
}

export function InventoryMovementsKpiRibbon({
  summary,
  isLoading = false,
}: InventoryMovementsKpiRibbonProps) {
  const { t } = useTranslation()

  const totalMovements = summary?.totalMovements ?? 0
  const totalIn = summary?.totalIn ?? 0
  const totalOut = summary?.totalOut ?? 0
  const netDelta = summary?.netDelta ?? 0

  return (
    <div className='grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4'>
      {/* Total Movements */}
      <Card className='border bg-card shadow-2xs py-3 px-4'>
        <CardContent className='p-0 flex items-center justify-between'>
          <div className='space-y-1'>
            <p className='text-xs font-medium text-muted-foreground'>
              {t('inventoryMovements.kpi.totalMovements', 'Total Movements')}
            </p>
            {isLoading ? (
              <Skeleton className='h-7 w-20' />
            ) : (
              <p className='text-xl sm:text-2xl font-bold font-mono tracking-tight text-foreground'>
                {totalMovements.toLocaleString()}
              </p>
            )}
            <p className='text-[10px] text-muted-foreground'>
              {t('inventoryMovements.kpi.movementsCount', 'movements recorded')}
            </p>
          </div>
          <div className='rounded-full bg-primary/10 p-2 text-primary shrink-0'>
            <Activity className='h-4 w-4 sm:h-5 sm:w-5' />
          </div>
        </CardContent>
      </Card>

      {/* Inbound Units */}
      <Card className='border bg-card shadow-2xs py-3 px-4'>
        <CardContent className='p-0 flex items-center justify-between'>
          <div className='space-y-1'>
            <p className='text-xs font-medium text-muted-foreground'>
              {t('inventoryMovements.kpi.totalIn', 'Inbound Units')}
            </p>
            {isLoading ? (
              <Skeleton className='h-7 w-20' />
            ) : (
              <p className='text-xl sm:text-2xl font-bold font-mono tracking-tight text-emerald-600 dark:text-emerald-400'>
                +{totalIn.toLocaleString()}
              </p>
            )}
            <p className='text-[10px] text-muted-foreground'>
              {t('inventoryMovements.kpi.inDescription', 'Stock additions & receipts')}
            </p>
          </div>
          <div className='rounded-full bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400 shrink-0'>
            <ArrowDownRight className='h-4 w-4 sm:h-5 sm:w-5' />
          </div>
        </CardContent>
      </Card>

      {/* Outbound Units */}
      <Card className='border bg-card shadow-2xs py-3 px-4'>
        <CardContent className='p-0 flex items-center justify-between'>
          <div className='space-y-1'>
            <p className='text-xs font-medium text-muted-foreground'>
              {t('inventoryMovements.kpi.totalOut', 'Outbound Units')}
            </p>
            {isLoading ? (
              <Skeleton className='h-7 w-20' />
            ) : (
              <p className='text-xl sm:text-2xl font-bold font-mono tracking-tight text-rose-600 dark:text-rose-400'>
                -{totalOut.toLocaleString()}
              </p>
            )}
            <p className='text-[10px] text-muted-foreground'>
              {t('inventoryMovements.kpi.outDescription', 'Dispatches & deductions')}
            </p>
          </div>
          <div className='rounded-full bg-rose-500/10 p-2 text-rose-600 dark:text-rose-400 shrink-0'>
            <ArrowUpRight className='h-4 w-4 sm:h-5 sm:w-5' />
          </div>
        </CardContent>
      </Card>

      {/* Net Delta */}
      <Card className='border bg-card shadow-2xs py-3 px-4'>
        <CardContent className='p-0 flex items-center justify-between'>
          <div className='space-y-1'>
            <p className='text-xs font-medium text-muted-foreground'>
              {t('inventoryMovements.kpi.netDelta', 'Net Delta')}
            </p>
            {isLoading ? (
              <Skeleton className='h-7 w-20' />
            ) : (
              <p
                className={`text-xl sm:text-2xl font-bold font-mono tracking-tight ${
                  netDelta >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {netDelta > 0 ? `+${netDelta.toLocaleString()}` : netDelta.toLocaleString()}
              </p>
            )}
            <p className='text-[10px] text-muted-foreground'>
              {netDelta >= 0
                ? t('inventoryMovements.kpi.netPositive', 'Net stock accumulation')
                : t('inventoryMovements.kpi.netNegative', 'Net stock reduction')}
            </p>
          </div>
          <div
            className={`rounded-full p-2 shrink-0 ${
              netDelta >= 0
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
            }`}
          >
            {netDelta >= 0 ? (
              <TrendingUp className='h-4 w-4 sm:h-5 sm:w-5' />
            ) : (
              <TrendingDown className='h-4 w-4 sm:h-5 sm:w-5' />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
