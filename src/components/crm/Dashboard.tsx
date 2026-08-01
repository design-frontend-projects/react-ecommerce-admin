import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface CRMMetrics {
  totalLeads: number
  leadConversionRate: number
  opportunities: number
  winRate: number
  recentRevenue: number
}

const DEFAULT_METRICS: CRMMetrics = {
  totalLeads: 150,
  leadConversionRate: 25,
  opportunities: 40,
  winRate: 35,
  recentRevenue: 45000,
}

export function Dashboard() {
  const [metrics] = useState<CRMMetrics>(DEFAULT_METRICS)
  const { t } = useTranslation()

  if (!metrics) return <div>{t('crm.loading', 'Loading...')}</div>

  return (
    <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
      <Card>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium'>
            {t('crm.totalLeads', 'Total Leads')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold'>{metrics.totalLeads}</div>
          <p className='text-xs text-muted-foreground'>
            {metrics.leadConversionRate.toFixed(1)}% {t('crm.conversionRate', 'conversion rate')}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium'>
            {t('crm.activeOpportunities', 'Active Opportunities')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold'>{metrics.opportunities}</div>
          <p className='text-xs text-muted-foreground'>
            {metrics.winRate.toFixed(1)}% {t('crm.winRate', 'win rate')}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium'>
            {t('crm.recentRevenue', 'Recent Revenue (30d)')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold'>
            ${metrics.recentRevenue.toLocaleString()}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
