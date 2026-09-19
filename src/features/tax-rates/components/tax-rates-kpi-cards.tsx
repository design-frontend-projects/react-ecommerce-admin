import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Percent, CheckCircle2, Globe2, Scale } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { TaxRateStats } from '../types'

interface TaxRatesKpiCardsProps {
  stats: TaxRateStats
  isLoading?: boolean
}

export function TaxRatesKpiCards({ stats, isLoading = false }: TaxRatesKpiCardsProps) {
  const { t } = useTranslation()

  const cardVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: (index: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: index * 0.06,
        duration: 0.35,
        ease: 'easeOut',
      },
    }),
  }

  const activePercent =
    stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0

  return (
    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
      {/* 1. Active Rates */}
      <motion.div
        custom={0}
        initial='hidden'
        animate='visible'
        variants={cardVariants}
      >
        <Card className='border-border/60 shadow-xs hover:border-primary/40 hover:shadow-sm transition-all'>
          <CardContent className='flex items-center justify-between p-5'>
            <div className='space-y-1'>
              <p className='text-xs font-medium uppercase tracking-wider text-muted-foreground'>
                {t('taxRates.kpi.activeRates', 'Active Tax Rates')}
              </p>
              <div className='flex items-baseline gap-2'>
                <span className='text-2xl font-bold tracking-tight text-foreground'>
                  {isLoading ? '...' : stats.active}
                </span>
                <span className='text-xs text-muted-foreground'>
                  {t('taxRates.kpi.ofTotal', {
                    total: stats.total,
                    percent: activePercent,
                    defaultValue: `of ${stats.total} total (${activePercent}%)`,
                  })}
                </span>
              </div>
            </div>
            <div className='flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'>
              <CheckCircle2 className='h-5 w-5' />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 2. Average Rate */}
      <motion.div
        custom={1}
        initial='hidden'
        animate='visible'
        variants={cardVariants}
      >
        <Card className='border-border/60 shadow-xs hover:border-primary/40 hover:shadow-sm transition-all'>
          <CardContent className='flex items-center justify-between p-5'>
            <div className='space-y-1'>
              <p className='text-xs font-medium uppercase tracking-wider text-muted-foreground'>
                {t('taxRates.kpi.averageRate', 'Average Active Rate')}
              </p>
              <div className='flex items-baseline gap-2'>
                <span className='text-2xl font-bold tracking-tight text-foreground font-mono'>
                  {isLoading ? '...' : `${stats.avgActiveRate}%`}
                </span>
                <span className='text-xs text-muted-foreground'>
                  {t('taxRates.kpi.standardMean', 'Standard mean')}
                </span>
              </div>
            </div>
            <div className='flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary'>
              <Percent className='h-5 w-5' />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 3. Mode Distribution */}
      <motion.div
        custom={2}
        initial='hidden'
        animate='visible'
        variants={cardVariants}
      >
        <Card className='border-border/60 shadow-xs hover:border-primary/40 hover:shadow-sm transition-all'>
          <CardContent className='flex items-center justify-between p-5'>
            <div className='space-y-1'>
              <p className='text-xs font-medium uppercase tracking-wider text-muted-foreground'>
                {t('taxRates.kpi.taxTypeDistribution', 'Inclusive / Exclusive')}
              </p>
              <div className='flex items-baseline gap-2'>
                <span className='text-2xl font-bold tracking-tight text-foreground'>
                  {isLoading
                    ? '...'
                    : `${stats.inclusiveCount} / ${stats.exclusiveCount}`}
                </span>
                <span className='text-xs text-muted-foreground'>
                  {t('taxRates.kpi.incVsExc', 'Inc vs Exc')}
                </span>
              </div>
            </div>
            <div className='flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400'>
              <Scale className='h-5 w-5' />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 4. Jurisdictions */}
      <motion.div
        custom={3}
        initial='hidden'
        animate='visible'
        variants={cardVariants}
      >
        <Card className='border-border/60 shadow-xs hover:border-primary/40 hover:shadow-sm transition-all'>
          <CardContent className='flex items-center justify-between p-5'>
            <div className='space-y-1'>
              <p className='text-xs font-medium uppercase tracking-wider text-muted-foreground'>
                {t('taxRates.kpi.jurisdictions', 'Covered Jurisdictions')}
              </p>
              <div className='flex items-baseline gap-2'>
                <span className='text-2xl font-bold tracking-tight text-foreground'>
                  {isLoading ? '...' : stats.jurisdictionsCount}
                </span>
                <span className='text-xs text-muted-foreground'>
                  {t('taxRates.kpi.countriesAssigned', 'Countries configured')}
                </span>
              </div>
            </div>
            <div className='flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400'>
              <Globe2 className='h-5 w-5' />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
