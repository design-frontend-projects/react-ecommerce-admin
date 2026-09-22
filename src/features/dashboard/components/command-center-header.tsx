import { RefreshCw, Warehouse, Calendar, ArrowUpRight, Plus, Activity } from 'lucide-react'
import { Link } from '@tanstack/react-router'
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
  const formattedTime = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : 'Just now'

  return (
    <div className='flex flex-col gap-4 pb-2 border-b border-border/40'>
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
        {/* Title & Live Status */}
        <div className='space-y-1'>
          <div className='flex items-center gap-3'>
            <h1 className='text-2xl md:text-3xl font-bold tracking-tight text-foreground'>
              Command Center
            </h1>
            <div className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'>
              <span className='w-2 h-2 rounded-full bg-emerald-500 animate-pulse' />
              <span>LIVE</span>
            </div>
          </div>
          <div className='flex items-center gap-2 text-xs text-muted-foreground'>
            <Activity className='w-3.5 h-3.5' />
            <span>Real-time multi-warehouse analytics & telemetry</span>
            <span>•</span>
            <span>Synced at {formattedTime}</span>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className='flex items-center gap-2 flex-wrap sm:flex-nowrap'>
          <Button
            variant='outline'
            size='sm'
            onClick={onRefresh}
            disabled={isRefetching}
            className='h-9 px-3 gap-1.5 bg-background/50 hover:bg-accent border-border/60 transition-all'
            title='Refresh all dashboard analytics'
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin text-primary' : ''}`} />
            <span className='text-xs font-medium'>
              {isRefetching ? 'Syncing...' : 'Sync Data'}
            </span>
          </Button>

          <Button
            size='sm'
            asChild
            className='h-9 px-3 gap-1.5 shadow-xs bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs'
          >
            <Link to='/purchase-orders'>
              <Plus className='w-3.5 h-3.5' />
              <span>New PO</span>
            </Link>
          </Button>

          <Button
            variant='secondary'
            size='sm'
            asChild
            className='h-9 px-3 gap-1.5 font-medium text-xs'
          >
            <Link to='/inventory-valuation'>
              <span>Valuation Report</span>
              <ArrowUpRight className='w-3 h-3 text-muted-foreground' />
            </Link>
          </Button>
        </div>
      </div>

      {/* Filter Toolbar Bar */}
      <div className='flex flex-wrap items-center justify-between gap-3 pt-2'>
        <div className='flex items-center gap-3 flex-wrap'>
          {/* Warehouse Selector */}
          <div className='flex items-center gap-2'>
            <Warehouse className='w-4 h-4 text-muted-foreground hidden sm:inline' />
            <Select value={selectedWarehouseId} onValueChange={onWarehouseChange}>
              <SelectTrigger className='w-[190px] h-8 text-xs font-medium bg-background/60 border-border/60'>
                <SelectValue placeholder='Select Warehouse' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all' className='text-xs font-medium'>
                  🌐 All Warehouses
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
          <div className='flex items-center p-0.5 rounded-lg bg-muted/60 border border-border/40'>
            <Calendar className='w-3.5 h-3.5 ml-2 text-muted-foreground mr-1 hidden sm:inline' />
            {(['7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                type='button'
                onClick={() => onTimeRangeChange(range)}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
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

        <div className='text-xs text-muted-foreground hidden md:block'>
          Auto-refreshes every 5 mins
        </div>
      </div>
    </div>
  )
}
