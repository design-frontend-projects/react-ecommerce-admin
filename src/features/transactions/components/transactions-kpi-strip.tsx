import { useTranslation } from 'react-i18next'
import {
  ArrowDownLeft,
  ArrowUpRight,
  CircleDollarSign,
  Clock,
  RotateCcw,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import type { FinancialTransactionStats } from '../data/schema'

interface TransactionsKpiStripProps {
  stats?: FinancialTransactionStats
  isLoading?: boolean
}

export function TransactionsKpiStrip({
  stats,
  isLoading = false,
}: TransactionsKpiStripProps) {
  const { t } = useTranslation()

  const formatAmount = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(num)
  }

  if (isLoading) {
    return (
      <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5'>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className='rounded-xl border bg-card/60 p-4 shadow-xs space-y-2'>
            <Skeleton className='h-4 w-24' />
            <Skeleton className='h-7 w-32' />
            <Skeleton className='h-3 w-20' />
          </div>
        ))}
      </div>
    )
  }

  const kpis = [
    {
      title: t('transactions.kpis.totalVolume', 'Total Volume'),
      value: formatAmount(stats?.totalVolume ?? 0),
      desc: t('transactions.kpis.totalVolumeDesc', 'Net settled turnover'),
      icon: CircleDollarSign,
      iconColor: 'text-primary bg-primary/10',
    },
    {
      title: t('transactions.kpis.totalInflow', 'Total Inflow'),
      value: formatAmount(stats?.totalInflow ?? 0),
      desc: t('transactions.kpis.totalInflowDesc', 'Sales, income & receipts'),
      icon: ArrowDownLeft,
      iconColor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10',
    },
    {
      title: t('transactions.kpis.totalOutflow', 'Total Outflow'),
      value: formatAmount(stats?.totalOutflow ?? 0),
      desc: t('transactions.kpis.totalOutflowDesc', 'Purchases & expenditures'),
      icon: ArrowUpRight,
      iconColor: 'text-rose-600 dark:text-rose-400 bg-rose-500/10',
    },
    {
      title: t('transactions.kpis.totalRefunds', 'Total Refunds'),
      value: formatAmount(stats?.totalRefunds ?? 0),
      desc: t('transactions.kpis.totalRefundsDesc', 'Reversals & chargebacks'),
      icon: RotateCcw,
      iconColor: 'text-purple-600 dark:text-purple-400 bg-purple-500/10',
    },
    {
      title: t('transactions.kpis.pendingCount', 'Pending Settlement'),
      value: (stats?.pendingCount ?? 0).toString(),
      desc: t('transactions.kpis.pendingCountDesc', 'Awaiting clearance'),
      icon: Clock,
      iconColor: 'text-amber-600 dark:text-amber-400 bg-amber-500/10',
    },
  ]

  return (
    <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5'>
      {kpis.map((kpi, idx) => {
        const Icon = kpi.icon
        return (
          <div
            key={idx}
            className='rounded-xl border bg-card/60 p-4 shadow-xs space-y-1.5 transition-all hover:bg-card/80 hover:shadow-sm'
          >
            <div className='flex items-center justify-between'>
              <span className='text-xs font-semibold text-muted-foreground'>
                {kpi.title}
              </span>
              <div className={`p-1.5 rounded-md ${kpi.iconColor}`}>
                <Icon className='h-4 w-4' />
              </div>
            </div>
            <p className='text-xl sm:text-2xl font-bold tracking-tight text-foreground'>
              {kpi.value}
            </p>
            <p className='text-[11px] text-muted-foreground'>{kpi.desc}</p>
          </div>
        )
      })}
    </div>
  )
}
