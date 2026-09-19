import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  ClipboardList,
  PlayCircle,
  FileCheck2,
  CheckCircle2,
  XCircle,
  FileText,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { CountListItem } from '../data/schema'
import { useCountsContext, type CountStatusFilter } from './provider'

interface CountsStatsProps {
  data: CountListItem[]
}

export function CountsStats({ data }: CountsStatsProps) {
  const { t } = useTranslation()
  const { statusFilter, setStatusFilter } = useCountsContext()

  const total = data.length
  let draftCount = 0
  let countingCount = 0
  let reviewCount = 0
  let postedCount = 0
  let cancelledCount = 0

  for (const c of data) {
    if (c.status === 'draft') draftCount++
    else if (c.status === 'counting') countingCount++
    else if (c.status === 'review') reviewCount++
    else if (c.status === 'posted') postedCount++
    else if (c.status === 'cancelled') cancelledCount++
  }

  const kpis: {
    key: CountStatusFilter
    title: string
    value: number
    subtitle: string
    icon: React.ComponentType<{ className?: string }>
    color: string
    bgColor: string
    borderColor: string
    activeRing: string
  }[] = [
    {
      key: 'all',
      title: t('stockCounts.stats.total', { defaultValue: 'All Stock Counts' }),
      value: total,
      subtitle: t('stockCounts.stats.totalDesc', { defaultValue: 'Total audit cycles' }),
      icon: ClipboardList,
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-500/10',
      borderColor: 'border-indigo-500/20',
      activeRing: 'ring-indigo-500 border-indigo-500 bg-indigo-500/5',
    },
    {
      key: 'draft',
      title: t('stockCounts.stats.draft', { defaultValue: 'Draft' }),
      value: draftCount,
      subtitle: t('stockCounts.stats.draftDesc', { defaultValue: 'Ready to freeze' }),
      icon: FileText,
      color: 'text-slate-600 dark:text-slate-400',
      bgColor: 'bg-slate-500/10',
      borderColor: 'border-slate-500/20',
      activeRing: 'ring-slate-500 border-slate-500 bg-slate-500/5',
    },
    {
      key: 'counting',
      title: t('stockCounts.stats.counting', { defaultValue: 'In Counting' }),
      value: countingCount,
      subtitle: t('stockCounts.stats.countingDesc', { defaultValue: 'Physical counting' }),
      icon: PlayCircle,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
      activeRing: 'ring-amber-500 border-amber-500 bg-amber-500/5',
    },
    {
      key: 'review',
      title: t('stockCounts.stats.review', { defaultValue: 'Under Review' }),
      value: reviewCount,
      subtitle: t('stockCounts.stats.reviewDesc', { defaultValue: 'Variance approval' }),
      icon: FileCheck2,
      color: 'text-teal-600 dark:text-teal-400',
      bgColor: 'bg-teal-500/10',
      borderColor: 'border-teal-500/20',
      activeRing: 'ring-teal-500 border-teal-500 bg-teal-500/5',
    },
    {
      key: 'posted',
      title: t('stockCounts.stats.posted', { defaultValue: 'Posted' }),
      value: postedCount,
      subtitle: t('stockCounts.stats.postedDesc', { defaultValue: 'Reconciled & ledgered' }),
      icon: CheckCircle2,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      activeRing: 'ring-emerald-500 border-emerald-500 bg-emerald-500/5',
    },
    {
      key: 'cancelled',
      title: t('stockCounts.stats.cancelled', { defaultValue: 'Cancelled' }),
      value: cancelledCount,
      subtitle: t('stockCounts.stats.cancelledDesc', { defaultValue: 'Voided sessions' }),
      icon: XCircle,
      color: 'text-rose-600 dark:text-rose-400',
      bgColor: 'bg-rose-500/10',
      borderColor: 'border-rose-500/20',
      activeRing: 'ring-rose-500 border-rose-500 bg-rose-500/5',
    },
  ]

  return (
    <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6'>
      {kpis.map((kpi) => {
        const Icon = kpi.icon
        const isActive = statusFilter === kpi.key

        return (
          <motion.div
            key={kpi.key}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.15 }}
          >
            <Card
              onClick={() =>
                setStatusFilter(statusFilter === kpi.key && kpi.key !== 'all' ? 'all' : kpi.key)
              }
              className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                kpi.borderColor
              } ${
                isActive
                  ? `${kpi.activeRing} ring-2 shadow-sm`
                  : 'bg-card hover:bg-accent/40'
              }`}
            >
              <CardContent className='p-3 sm:p-4'>
                <div className='flex items-center justify-between gap-1'>
                  <span className='truncate text-xs font-semibold text-muted-foreground'>
                    {kpi.title}
                  </span>
                  <div className={`rounded-md p-1.5 ${kpi.bgColor}`}>
                    <Icon className={`h-4 w-4 ${kpi.color}`} />
                  </div>
                </div>
                <div className='mt-2'>
                  <div className='text-2xl font-bold tracking-tight'>
                    {kpi.value}
                  </div>
                  <p className='truncate text-[11px] text-muted-foreground'>
                    {kpi.subtitle}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}
