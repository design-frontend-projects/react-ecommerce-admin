import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import {
  RefreshCw,
  Warehouse,
  Calendar,
  ArrowUpRight,
  Plus,
  Activity,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { WarehouseFilterOption } from '../types'

interface CommandCenterHeaderProps {
  warehouses: WarehouseFilterOption[]
  selectedWarehouseId: string
  onWarehouseChange: (id: string) => void
  timeRange: '7d' | '30d' | '90d'
  onTimeRangeChange: (range: '7d' | '30d' | '90d') => void
  onRefresh: () => void
  isRefetching: boolean
  lastUpdated?: string
}

export function CommandCenterHeader({
  warehouses,
  selectedWarehouseId,
  onWarehouseChange,
  timeRange,
  onTimeRangeChange,
  onRefresh,
  isRefetching,
  lastUpdated,
}: CommandCenterHeaderProps) {
  const { t } = useTranslation()

  const formattedTime = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : t('dashboard.commandCenter.justNow', 'Just now')

  return (
    <div className='flex flex-col gap-4 border-b border-border/40 pb-2'>
      <div className='flex flex-col justify-between gap-4 sm:flex-row sm:items-center'>
        {/* Title & Live Status */}
        <div className='space-y-1'>
          <div className='flex items-center gap-3'>
            <h1 className='text-2xl font-bold tracking-tight text-foreground md:text-3xl'>
              {t('dashboard.commandCenter.title', 'Command Center')}
            </h1>
            <div className='inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400'>
              <span className='h-2 w-2 animate-pulse rounded-full bg-emerald-500' />
              <span>{t('dashboard.commandCenter.live', 'LIVE')}</span>
            </div>
          </div>
          <div className='flex items-center gap-2 text-xs text-muted-foreground'>
            <Activity className='h-3.5 w-3.5' />
            <span>
              {t(
                'dashboard.commandCenter.subtitle',
                'Real-time multi-warehouse analytics & telemetry'
              )}
            </span>
            <span>•</span>
            <span>
              {t('dashboard.commandCenter.syncedAt', 'Synced at {{time}}', {
                time: formattedTime,
              })}
            </span>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className='flex flex-wrap items-center gap-2 sm:flex-nowrap'>
          <Button
            variant='outline'
            size='sm'
            onClick={onRefresh}
            disabled={isRefetching}
            className='h-9 gap-1.5 border-border/60 bg-background/50 px-3 transition-all hover:bg-accent'
            title={t(
              'dashboard.commandCenter.refreshTooltip',
              'Refresh all dashboard analytics'
            )}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRefetching ? 'animate-spin text-primary' : ''}`}
            />
            <span className='text-xs font-medium'>
              {isRefetching
                ? t('dashboard.commandCenter.syncing', 'Syncing...')
                : t('dashboard.commandCenter.syncData', 'Sync Data')}
            </span>
          </Button>

          <Button
            size='sm'
            asChild
            className='h-9 gap-1.5 bg-primary px-3 text-xs font-medium text-primary-foreground shadow-xs hover:bg-primary/90'
          >
            <Link to='/purchase-orders'>
              <Plus className='h-3.5 w-3.5' />
              <span>{t('dashboard.commandCenter.newPo', 'New PO')}</span>
            </Link>
          </Button>

          <Button
            variant='secondary'
            size='sm'
            asChild
            className='h-9 gap-1.5 px-3 text-xs font-medium'
          >
            <Link to='/inventory/valuation'>
              <span>
                {t('dashboard.commandCenter.valuationReport', 'Valuation Report')}
              </span>
              <ArrowUpRight className='h-3 w-3 text-muted-foreground' />
            </Link>
          </Button>
        </div>
      </div>

      {/* Filter Toolbar Bar */}
      <div className='flex flex-wrap items-center justify-between gap-3 pt-2'>
        <div className='flex flex-wrap items-center gap-3'>
          {/* Warehouse Selector */}
          <div className='flex items-center gap-2'>
            <Warehouse className='hidden h-4 w-4 text-muted-foreground sm:inline' />
            <Select
              value={selectedWarehouseId}
              onValueChange={onWarehouseChange}
            >
              <SelectTrigger className='h-8 w-[190px] border-border/60 bg-background/60 text-xs font-medium'>
                <SelectValue
                  placeholder={t(
                    'dashboard.commandCenter.selectWarehouse',
                    'Select Warehouse'
                  )}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all' className='text-xs font-medium'>
                  🌐 {t('dashboard.commandCenter.allWarehouses', 'All Warehouses')}
                </SelectItem>
                {warehouses
                  .filter((w) => w.id !== 'all')
                  .map((w) => (
                    <SelectItem key={w.id} value={w.id} className='text-xs'>
                      📦 {w.name} {w.code ? `(${w.code})` : ''}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Time Range Pills */}
          <div className='flex items-center rounded-lg border border-border/40 bg-muted/60 p-0.5'>
            <Calendar className='mr-1 ml-2 hidden h-3.5 w-3.5 text-muted-foreground sm:inline' />
            {(['7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                type='button'
                onClick={() => onTimeRangeChange(range)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                  timeRange === range
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {range.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className='hidden text-xs text-muted-foreground md:block'>
          {t(
            'dashboard.commandCenter.autoRefreshNotice',
            'Auto-refreshes every 5 mins'
          )}
        </div>
      </div>
    </div>
  )
}
