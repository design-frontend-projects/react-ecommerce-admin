import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { RequisitionStatus } from '../data/schema'

const statusConfig: Record<
  RequisitionStatus,
  { label: string; className: string }
> = {
  draft: {
    label: 'Draft',
    className:
      'bg-slate-100 text-slate-800 hover:bg-slate-100 dark:bg-slate-800/40 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  },
  submitted: {
    label: 'Submitted',
    className:
      'bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  },
  approved: {
    label: 'Approved',
    className:
      'bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  },
  rejected: {
    label: 'Rejected',
    className:
      'bg-rose-100 text-rose-800 hover:bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800',
  },
  converted: {
    label: 'Converted to PO',
    className:
      'bg-purple-100 text-purple-800 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800',
  },
  cancelled: {
    label: 'Cancelled',
    className:
      'bg-zinc-100 text-zinc-600 hover:bg-zinc-100 dark:bg-zinc-800/30 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700',
  },
}

interface PRStatusBadgeProps {
  status: RequisitionStatus | string
  className?: string
}

export function PRStatusBadge({ status, className }: PRStatusBadgeProps) {
  const { t } = useTranslation()
  const config =
    statusConfig[status as RequisitionStatus] || {
      label: status,
      className: 'bg-muted text-muted-foreground',
    }

  const translatedLabel = t(`purchaseRequisitions.status.${status}`, config.label)

  return (
    <Badge
      variant='secondary'
      className={cn('font-medium capitalize text-xs', config.className, className)}
    >
      {translatedLabel}
    </Badge>
  )
}
