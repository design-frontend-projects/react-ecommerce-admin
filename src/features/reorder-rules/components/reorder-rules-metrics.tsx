import { useTranslation } from 'react-i18next'
import { Boxes, CheckCircle2, ShieldAlert, Building2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { ReorderRulesMetrics } from '../data/schema'

interface ReorderRulesMetricsProps {
  metrics?: ReorderRulesMetrics
  isLoading?: boolean
  selectedStatus?: boolean | undefined
  onStatusSelect?: (status: boolean | undefined) => void
}

export function ReorderRulesMetricsBanner({
  metrics,
  isLoading = false,
  selectedStatus,
  onStatusSelect,
}: ReorderRulesMetricsProps) {
  const { t } = useTranslation()

  const cards = [
    {
      id: 'total',
      title: t('reorderRules.metrics.totalRules', 'Total Rules'),
      value: metrics?.totalRules ?? 0,
      description: t(
        'reorderRules.metrics.totalRulesDesc',
        'Configured variant thresholds'
      ),
      icon: Boxes,
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-500/10',
      borderColor: selectedStatus === undefined ? 'ring-2 ring-primary/40' : '',
      onClick: () => onStatusSelect?.(undefined),
    },
    {
      id: 'active',
      title: t('reorderRules.metrics.activeRules', 'Active Rules'),
      value: metrics?.activeRules ?? 0,
      description: t(
        'reorderRules.metrics.activeRulesDesc',
        'Driving automated checks'
      ),
      icon: CheckCircle2,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: selectedStatus === true ? 'ring-2 ring-emerald-500' : '',
      onClick: () => onStatusSelect?.(selectedStatus === true ? undefined : true),
    },
    {
      id: 'inactive',
      title: t('reorderRules.metrics.inactiveRules', 'Inactive Rules'),
      value: metrics?.inactiveRules ?? 0,
      description: t('reorderRules.metrics.inactiveRulesDesc', 'Paused or draft rules'),
      icon: ShieldAlert,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: selectedStatus === false ? 'ring-2 ring-amber-500' : '',
      onClick: () => onStatusSelect?.(selectedStatus === false ? undefined : false),
    },
    {
      id: 'stores',
      title: t('reorderRules.metrics.storesCount', 'Configured Stores'),
      value: metrics?.totalStores ?? 0,
      description: t(
        'reorderRules.metrics.storesCountDesc',
        'Distinct locations monitored'
      ),
      icon: Building2,
      color: 'text-sky-600 dark:text-sky-400',
      bgColor: 'bg-sky-500/10',
      borderColor: '',
      onClick: undefined,
    },
  ]

  return (
    <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Card
            key={card.id}
            onClick={card.onClick}
            className={`transition-all duration-200 ${
              card.onClick
                ? 'cursor-pointer hover:border-primary/50 hover:shadow-sm active:scale-[0.99]'
                : ''
            } ${card.borderColor}`}
          >
            <CardContent className='flex items-center justify-between p-4'>
              <div className='flex flex-col gap-1'>
                <span className='text-xs font-medium text-muted-foreground'>
                  {card.title}
                </span>
                {isLoading ? (
                  <Skeleton className='h-7 w-14' />
                ) : (
                  <span className='text-2xl font-bold tracking-tight'>
                    {card.value.toLocaleString()}
                  </span>
                )}
                <span className='line-clamp-1 text-[11px] text-muted-foreground'>
                  {card.description}
                </span>
              </div>
              <div className={`rounded-xl p-2.5 ${card.bgColor}`}>
                <Icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
