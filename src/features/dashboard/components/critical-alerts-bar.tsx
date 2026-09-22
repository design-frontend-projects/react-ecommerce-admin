import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle,
  AlertOctagon,
  CalendarAlert,
  ClockAlert,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { CriticalAlertCounts } from '../types'

interface CriticalAlertsBarProps {
  alerts: CriticalAlertCounts
  onSelectFilter?: (type: 'all' | 'out_of_stock' | 'low_stock' | 'expired' | 'overdue') => void
}

export function CriticalAlertsBar({ alerts, onSelectFilter }: CriticalAlertsBarProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  const hasCritical =
    alerts.outOfStockCount > 0 ||
    alerts.expiredCount > 0 ||
    alerts.overduePoCount > 0 ||
    alerts.lowStockCount > 0

  if (!hasCritical) {
    return (
      <div className='flex items-center justify-between px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400'>
        <div className='flex items-center gap-2.5 text-xs sm:text-sm font-medium'>
          <CheckCircle2 className='w-4 h-4 text-emerald-500' />
          <span>All inventory parameters are within optimal thresholds. No critical stock breaches detected.</span>
        </div>
        <Badge variant='outline' className='bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/30 text-xs font-semibold'>
          Status: Normal
        </Badge>
      </div>
    )
  }

  return (
    <div className='rounded-xl border border-destructive/30 bg-destructive/5 dark:bg-destructive/10 overflow-hidden shadow-xs'>
      {/* Top Banner Row */}
      <div className='flex items-center justify-between px-4 py-3'>
        <div className='flex items-center gap-2.5'>
          <div className='flex items-center justify-center w-7 h-7 rounded-lg bg-destructive/15 text-destructive'>
            <AlertOctagon className='w-4 h-4 animate-bounce' />
          </div>
          <div>
            <span className='font-semibold text-xs sm:text-sm text-foreground'>
              Action Required:
            </span>{' '}
            <span className='text-xs sm:text-sm text-muted-foreground'>
              {alerts.totalCritical} critical condition{alerts.totalCritical > 1 ? 's' : ''} require attention
            </span>
          </div>
        </div>

        <div className='flex items-center gap-2'>
          <button
            type='button'
            onClick={() => setIsExpanded(!isExpanded)}
            className='p-1 text-muted-foreground hover:text-foreground rounded-md transition-colors'
            title={isExpanded ? 'Collapse alerts' : 'Expand alerts'}
          >
            {isExpanded ? <ChevronUp className='w-4 h-4' /> : <ChevronDown className='w-4 h-4' />}
          </button>
        </div>
      </div>

      {/* Expandable Alert Pills */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className='px-4 pb-3 pt-1 border-t border-destructive/20 flex flex-wrap gap-2.5 items-center'
          >
            {/* Out of Stock Badge */}
            {alerts.outOfStockCount > 0 && (
              <button
                type='button'
                onClick={() => onSelectFilter?.('out_of_stock')}
                className='inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-red-500/15 hover:bg-red-500/25 text-red-600 dark:text-red-400 border border-red-500/30 transition-all cursor-pointer'
              >
                <AlertOctagon className='w-3.5 h-3.5' />
                <span>{alerts.outOfStockCount} Out of Stock</span>
              </button>
            )}

            {/* Low Stock Badge */}
            {alerts.lowStockCount > 0 && (
              <button
                type='button'
                onClick={() => onSelectFilter?.('low_stock')}
                className='inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 border border-amber-500/30 transition-all cursor-pointer'
              >
                <AlertTriangle className='w-3.5 h-3.5' />
                <span>{alerts.lowStockCount} Low Stock</span>
              </button>
            )}

            {/* Expired Batches Badge */}
            {alerts.expiredCount > 0 && (
              <button
                type='button'
                onClick={() => onSelectFilter?.('expired')}
                className='inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 border border-rose-500/30 transition-all cursor-pointer'
              >
                <CalendarAlert className='w-3.5 h-3.5' />
                <span>{alerts.expiredCount} Batches Expired</span>
              </button>
            )}

            {/* Expiring Soon Badge */}
            {alerts.expiringSoonCount > 0 && (
              <div className='inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20'>
                <ClockAlert className='w-3.5 h-3.5' />
                <span>{alerts.expiringSoonCount} Expiring Soon (&lt;30d)</span>
              </div>
            )}

            {/* Overdue Purchase Orders Badge */}
            {alerts.overduePoCount > 0 && (
              <button
                type='button'
                onClick={() => onSelectFilter?.('overdue')}
                className='inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-purple-500/15 hover:bg-purple-500/25 text-purple-600 dark:text-purple-400 border border-purple-500/30 transition-all cursor-pointer'
              >
                <ClockAlert className='w-3.5 h-3.5' />
                <span>{alerts.overduePoCount} Overdue Purchase Orders</span>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
