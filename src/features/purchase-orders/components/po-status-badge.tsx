import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { type PurchaseOrderStatus } from '../hooks/use-purchase-orders'

interface StatusDisplayConfig {
  label: string
  className: string
  dotClass: string
}

const statusConfig: Record<string, StatusDisplayConfig> = {
  draft: {
    label: 'Draft',
    className:
      'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/40 dark:text-slate-300 dark:border-slate-700',
    dotClass: 'bg-slate-500',
  },
  pending: {
    label: 'Pending',
    className:
      'bg-amber-50 text-amber-800 border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60',
    dotClass: 'bg-amber-500',
  },
  approved: {
    label: 'Approved',
    className:
      'bg-indigo-50 text-indigo-700 border-indigo-200/60 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/60',
    dotClass: 'bg-indigo-500',
  },
  sent: {
    label: 'Sent',
    className:
      'bg-blue-50 text-blue-700 border-blue-200/60 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60',
    dotClass: 'bg-blue-500',
  },
  partial: {
    label: 'Partial',
    className:
      'bg-sky-50 text-sky-800 border-sky-200/60 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/60',
    dotClass: 'bg-sky-500',
  },
  partially_received: {
    label: 'Partially Received',
    className:
      'bg-sky-50 text-sky-800 border-sky-200/60 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/60',
    dotClass: 'bg-sky-500',
  },
  received: {
    label: 'Received',
    className:
      'bg-emerald-50 text-emerald-800 border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60',
    dotClass: 'bg-emerald-500',
  },
  closed: {
    label: 'Closed',
    className:
      'bg-purple-50 text-purple-700 border-purple-200/60 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60',
    dotClass: 'bg-purple-500',
  },
  cancelled: {
    label: 'Cancelled',
    className:
      'bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60',
    dotClass: 'bg-rose-500',
  },
}

interface POStatusBadgeProps {
  status: PurchaseOrderStatus | string | undefined | null
  className?: string
  showDot?: boolean
}

export function POStatusBadge({
  status,
  className,
  showDot = true,
}: POStatusBadgeProps) {
  const { t } = useTranslation()
  const key = String(status || 'pending').toLowerCase()
  const config = statusConfig[key] || statusConfig.pending

  return (
    <Badge
      variant='outline'
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold tracking-wide capitalize shadow-2xs border transition-colors',
        config.className,
        className
      )}
    >
      {showDot && (
        <span
          className={cn('h-1.5 w-1.5 rounded-full shrink-0 animate-pulse', config.dotClass)}
          aria-hidden='true'
        />
      )}
      <span>{t(`purchaseOrders.status.${key}`, config.label)}</span>
    </Badge>
  )
}
