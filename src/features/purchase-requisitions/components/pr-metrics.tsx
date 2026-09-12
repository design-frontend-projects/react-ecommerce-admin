import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  FileText,
  Clock,
  CheckCircle2,
  ArrowRightCircle,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { type RequisitionListItem } from '../data/schema'

interface PRMetricsProps {
  data: RequisitionListItem[]
}

export function PRMetrics({ data }: PRMetricsProps) {
  const { t } = useTranslation()
  const metrics = useMemo(() => {
    const total = data.length
    let drafts = 0
    let submitted = 0
    let approved = 0
    let converted = 0
    let totalEstValue = 0

    for (const req of data) {
      if (req.status === 'draft') drafts++
      else if (req.status === 'submitted') submitted++
      else if (req.status === 'approved') approved++
      else if (req.status === 'converted') converted++

      totalEstValue += Number(req.total_amount || 0)
    }

    return { total, drafts, submitted, approved, converted, totalEstValue }
  }, [data])

  if (data.length === 0) return null

  return (
    <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5'>
      <Card className='shadow-xs'>
        <CardContent className='flex items-center gap-3 p-3.5'>
          <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary'>
            <FileText className='h-4 w-4' />
          </div>
          <div className='min-w-0 flex-1'>
            <p className='text-xs font-medium text-muted-foreground truncate'>
              {t('purchaseRequisitions.metrics.total', 'Total Requisitions')}
            </p>
            <p className='text-xl font-bold tracking-tight'>{metrics.total}</p>
          </div>
        </CardContent>
      </Card>

      <Card className='shadow-xs'>
        <CardContent className='flex items-center gap-3 p-3.5'>
          <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-500/10 text-slate-600 dark:text-slate-300'>
            <Clock className='h-4 w-4' />
          </div>
          <div className='min-w-0 flex-1'>
            <p className='text-xs font-medium text-muted-foreground truncate'>
              {t('purchaseRequisitions.metrics.drafts', 'Drafts')}
            </p>
            <p className='text-xl font-bold tracking-tight'>{metrics.drafts}</p>
          </div>
        </CardContent>
      </Card>

      <Card className='shadow-xs'>
        <CardContent className='flex items-center gap-3 p-3.5'>
          <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400'>
            <Clock className='h-4 w-4' />
          </div>
          <div className='min-w-0 flex-1'>
            <p className='text-xs font-medium text-muted-foreground truncate'>
              {t('purchaseRequisitions.metrics.pendingReview', 'Pending Review')}
            </p>
            <p className='text-xl font-bold tracking-tight text-blue-600 dark:text-blue-400'>
              {metrics.submitted}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className='shadow-xs'>
        <CardContent className='flex items-center gap-3 p-3.5'>
          <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'>
            <CheckCircle2 className='h-4 w-4' />
          </div>
          <div className='min-w-0 flex-1'>
            <p className='text-xs font-medium text-muted-foreground truncate'>
              {t('purchaseRequisitions.metrics.readyToConvert', 'Ready to Convert')}
            </p>
            <p className='text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400'>
              {metrics.approved}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className='shadow-xs'>
        <CardContent className='flex items-center gap-3 p-3.5'>
          <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400'>
            <ArrowRightCircle className='h-4 w-4' />
          </div>
          <div className='min-w-0 flex-1'>
            <p className='text-xs font-medium text-muted-foreground truncate'>
              {t('purchaseRequisitions.metrics.convertedToPO', 'Converted to PO')}
            </p>
            <p className='text-xl font-bold tracking-tight text-purple-600 dark:text-purple-400'>
              {metrics.converted}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
