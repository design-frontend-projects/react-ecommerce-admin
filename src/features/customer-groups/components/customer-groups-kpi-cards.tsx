import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Users, Percent, UserCheck, Award } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { CustomerGroup } from '../hooks/use-customer-groups'

interface CustomerGroupKpiCardsProps {
  data: CustomerGroup[]
}

export function CustomerGroupKpiCards({ data }: CustomerGroupKpiCardsProps) {
  const { t } = useTranslation()

  const totalGroups = data.length
  const totalEnrolled = data.reduce((acc, g) => acc + (g.enrolled_count ?? 0), 0)
  
  const avgDiscount =
    totalGroups > 0
      ? (
          data.reduce((acc, g) => acc + (Number(g.discount_percentage) || 0), 0) /
          totalGroups
        ).toFixed(1)
      : '0.0'

  const highestDiscount =
    data.length > 0
      ? Math.max(...data.map((g) => Number(g.discount_percentage) || 0))
      : 0

  const kpis = [
    {
      title: t('customerGroups.kpis.total', 'Total Groups'),
      value: totalGroups,
      subtitle: t('customerGroups.kpis.totalSubtitle', 'Segmentation tiers'),
      icon: Users,
      color: 'text-blue-500 dark:text-blue-400',
      bgColor: 'bg-blue-500/10 border-blue-500/20',
    },
    {
      title: t('customerGroups.kpis.avgDiscount', 'Average Discount'),
      value: `${avgDiscount}%`,
      subtitle: t('customerGroups.kpis.avgDiscountSubtitle', 'Across all groups'),
      icon: Percent,
      color: 'text-emerald-500 dark:text-emerald-400',
      bgColor: 'bg-emerald-500/10 border-emerald-500/20',
    },
    {
      title: t('customerGroups.kpis.members', 'Enrolled Customers'),
      value: totalEnrolled,
      subtitle: t('customerGroups.kpis.membersSubtitle', 'Active assignments'),
      icon: UserCheck,
      color: 'text-violet-500 dark:text-violet-400',
      bgColor: 'bg-violet-500/10 border-violet-500/20',
    },
    {
      title: t('customerGroups.kpis.highestDiscount', 'Top Tier Discount'),
      value: `${highestDiscount}%`,
      subtitle: t('customerGroups.kpis.highestDiscountSubtitle', 'Maximum benefit'),
      icon: Award,
      color: 'text-amber-500 dark:text-amber-400',
      bgColor: 'bg-amber-500/10 border-amber-500/20',
    },
  ]

  return (
    <div className='grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4'>
      {kpis.map((kpi, idx) => {
        const Icon = kpi.icon
        return (
          <motion.div
            key={kpi.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: idx * 0.05 }}
          >
            <Card className='relative overflow-hidden border transition-all duration-200 hover:shadow-md'>
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
                  <div className='text-2xl sm:text-3xl font-bold tracking-tight'>
                    {kpi.value}
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
