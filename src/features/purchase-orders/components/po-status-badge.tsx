import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type POStatus = 'pending' | 'received' | 'partial' | 'cancelled'

const statusConfig: Record<
  POStatus,
  { label: string; className: string }
> = {
  pending: {
    label: 'Pending',
    className:
      'bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400',
  },
  partial: {
    label: 'Partial',
    className:
      'bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400',
  },
  received: {
    label: 'Received',
    className:
      'bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  cancelled: {
    label: 'Cancelled',
    className:
      'bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400',
  },
}

interface POStatusBadgeProps {
  status: POStatus
  className?: string
}

export function POStatusBadge({ status, className }: POStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.pending

  return (
    <Badge
      variant='secondary'
      className={cn('font-medium', config.className, className)}
    >
      {config.label}
    </Badge>
  )
}
