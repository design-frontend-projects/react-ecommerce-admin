import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Users, CheckCircle2, Star, ShieldCheck, Filter } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { Customer } from '../hooks/use-customers'
import { useCustomersContext, type CustomerFilterStatus } from './customers-provider'

interface CustomerKpiCardsProps {
  data: Customer[]
}

export function CustomerKpiCards({ data }: CustomerKpiCardsProps) {
  const { t } = useTranslation()
  const { filterStatus, setFilterStatus } = useCustomersContext()

  const totalCustomers = data.length
  const activeCustomers = data.filter((c) => c.is_active).length
  const loyaltyMembers = data.filter((c) => (c.loyalty_points ?? 0) > 0).length
  const groupedCustomers = data.filter((c) => !!c.group_id).length

  const kpis: {
    title: string
    value: number | string
    subtitle: string
    icon: React.ComponentType<{ className?: string }>
    color: string
    bgColor: string
    activeBorder: string
    filterValue: CustomerFilterStatus
  }[] = [
    {
      title: t('customers.kpis.total', 'Total Customers'),
      value: totalCustomers,
      subtitle: t('customers.kpis.totalSubtitle', 'Registered profiles'),
      icon: Users,
      color: 'text-blue-500 dark:text-blue-400',
      bgColor: 'bg-blue-500/10 border-blue-500/20',
      activeBorder: 'ring-2 ring-blue-500/50 border-blue-500',
      filterValue: 'all',
    },
    {
      title: t('customers.kpis.active', 'Active Customers'),
      value: activeCustomers,
      subtitle: `${totalCustomers > 0 ? Math.round((activeCustomers / totalCustomers) * 100) : 0}% ${t('customers.kpis.activeSubtitle', 'active rate')}`,
      icon: CheckCircle2,
      color: 'text-emerald-500 dark:text-emerald-400',
      bgColor: 'bg-emerald-500/10 border-emerald-500/20',
      activeBorder: 'ring-2 ring-emerald-500/50 border-emerald-500',
      filterValue: 'active',
    },
    {
      title: t('customers.kpis.loyalty', 'Loyalty Members'),
      value: loyaltyMembers,
      subtitle: t('customers.kpis.loyaltySubtitle', 'With rewards points'),
      icon: Star,
      color: 'text-amber-500 dark:text-amber-400',
      bgColor: 'bg-amber-500/10 border-amber-500/20',
      activeBorder: 'ring-2 ring-amber-500/50 border-amber-500',
      filterValue: 'loyalty',
    },
    {
      title: t('customers.kpis.grouped', 'Group Members'),
      value: groupedCustomers,
      subtitle: t('customers.kpis.groupedSubtitle', 'Tiered benefits'),
      icon: ShieldCheck,
      color: 'text-violet-500 dark:text-violet-400',
      bgColor: 'bg-violet-500/10 border-violet-500/20',
      activeBorder: 'ring-2 ring-violet-500/50 border-violet-500',
      filterValue: 'grouped',
    },
  ]

  const handleCardClick = (targetFilter: CustomerFilterStatus) => {
    if (filterStatus === targetFilter) {
      setFilterStatus(null)
    } else {
      setFilterStatus(targetFilter)
    }
  }

  return (
    <div className='grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4'>
      {kpis.map((kpi, idx) => {
        const Icon = kpi.icon
        const isSelected = filterStatus === kpi.filterValue

        return (
          <motion.div
            key={kpi.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: idx * 0.05 }}
          >
            <Card
              onClick={() => handleCardClick(kpi.filterValue)}
              className={`relative cursor-pointer overflow-hidden border transition-all duration-200 hover:shadow-md ${
                isSelected ? kpi.activeBorder : 'hover:border-primary/40'
              }`}
            >
              <CardContent className='p-4 sm:p-5'>
                <div className='flex items-center justify-between gap-2'>
                  <span className='text-xs sm:text-sm font-medium text-muted-foreground truncate'>
                    {kpi.title}
                  </span>
                  <div
                    className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border ${kpi.bgColor} ${kpi.color}`}
                  >
                    <Icon className='h-4 w-4 sm:h-5 sm:w-5' />
                  </div>
                </div>
                <div className='mt-2 sm:mt-3'>
                  <div className='flex items-baseline justify-between'>
                    <span className='text-2xl sm:text-3xl font-bold tracking-tight'>
                      {kpi.value}
                    </span>
                    {isSelected && (
                      <span className='flex items-center gap-0.5 text-[11px] font-medium text-primary'>
                        <Filter className='h-3 w-3' />
                        {t('common.filtered', 'Filtered')}
                      </span>
                    )}
                  </div>
                  <p className='mt-1 text-xs text-muted-foreground truncate'>
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
