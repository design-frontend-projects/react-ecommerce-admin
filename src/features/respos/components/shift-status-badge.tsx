// Status + review/correction badges for a shift row (specs/026).
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import type { ShiftDto } from '../data/shift-schemas'

const STATUS_STYLES: Record<ShiftDto['status'], string> = {
  open: 'border-green-500/40 bg-green-500/10 text-green-600 dark:text-green-400',
  closed: 'border-muted-foreground/30 bg-muted text-muted-foreground',
  force_closed:
    'border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-400',
  auto_closed: 'border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400',
}

export function ShiftStatusBadge({ shift }: { shift: ShiftDto }) {
  const { t } = useTranslation()

  const statusLabels: Record<ShiftDto['status'], string> = {
    open: t('shifts.status.open', 'Open'),
    closed: t('shifts.status.closed', 'Closed'),
    force_closed: t('shifts.status.forceClosed', 'Force-closed'),
    auto_closed: t('shifts.status.autoClosed', 'Auto-closed'),
  }

  return (
    <span className='inline-flex flex-wrap items-center gap-1'>
      <Badge variant='outline' className={STATUS_STYLES[shift.status]}>
        {statusLabels[shift.status]}
      </Badge>
      {shift.isStale && (
        <Badge
          variant='outline'
          className='border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400'
        >
          {t('shifts.status.stale', 'Stale')}
        </Badge>
      )}
      {shift.needsReview && (
        <Badge
          variant='outline'
          className='border-purple-500/40 bg-purple-500/10 text-purple-600 dark:text-purple-400'
        >
          {t('shifts.status.needsReview', 'Needs review')}
        </Badge>
      )}
      {shift.isCorrected && (
        <Badge
          variant='outline'
          className='border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400'
        >
          {t('shifts.status.corrected', 'Corrected')}
        </Badge>
      )}
    </span>
  )
}
