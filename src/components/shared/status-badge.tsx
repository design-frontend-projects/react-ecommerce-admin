import React from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Truck,
  Package,
  FileEdit,
  Send,
  Lock,
  ArrowRightCircle,
  Archive,
  RefreshCw,
} from 'lucide-react'

export type StandardStatus =
  | 'draft'
  | 'requested'
  | 'pending'
  | 'submitted'
  | 'assigned'
  | 'counting'
  | 'reviewed'
  | 'approved'
  | 'picked'
  | 'in_transit'
  | 'received'
  | 'posted'
  | 'completed'
  | 'cancelled'
  | 'rejected'
  | 'expired'
  | 'active'
  | 'inactive'
  | 'locked'
  | string

interface StatusBadgeProps {
  status: StandardStatus
  label?: string
  className?: string
  showIcon?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const statusConfig: Record<
  string,
  {
    label: string
    variant: 'default' | 'secondary' | 'destructive' | 'outline'
    className: string
    icon: React.ComponentType<{ className?: string }>
  }
> = {
  draft: {
    label: 'Draft',
    variant: 'secondary',
    className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    icon: FileEdit,
  },
  requested: {
    label: 'Requested',
    variant: 'outline',
    className: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    icon: Send,
  },
  pending: {
    label: 'Pending',
    variant: 'outline',
    className: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    icon: Clock,
  },
  submitted: {
    label: 'Submitted',
    variant: 'outline',
    className: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    icon: Send,
  },
  assigned: {
    label: 'Assigned',
    variant: 'outline',
    className: 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border-sky-200 dark:border-sky-800',
    icon: Clock,
  },
  counting: {
    label: 'Counting',
    variant: 'outline',
    className: 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200 dark:border-purple-800 animate-pulse',
    icon: RefreshCw,
  },
  reviewed: {
    label: 'Reviewed',
    variant: 'outline',
    className: 'bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300 border-teal-200 dark:border-teal-800',
    icon: CheckCircle2,
  },
  approved: {
    label: 'Approved',
    variant: 'default',
    className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    icon: CheckCircle2,
  },
  picked: {
    label: 'Picked',
    variant: 'outline',
    className: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
    icon: Package,
  },
  in_transit: {
    label: 'In Transit',
    variant: 'outline',
    className: 'bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300 border-orange-200 dark:border-orange-800',
    icon: Truck,
  },
  received: {
    label: 'Received',
    variant: 'outline',
    className: 'bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-300 border-green-200 dark:border-green-800',
    icon: ArrowRightCircle,
  },
  posted: {
    label: 'Posted',
    variant: 'default',
    className: 'bg-emerald-600 text-white dark:bg-emerald-600 dark:text-white border-transparent',
    icon: CheckCircle2,
  },
  completed: {
    label: 'Completed',
    variant: 'default',
    className: 'bg-emerald-600 text-white dark:bg-emerald-600 dark:text-white border-transparent',
    icon: CheckCircle2,
  },
  cancelled: {
    label: 'Cancelled',
    variant: 'destructive',
    className: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    icon: XCircle,
  },
  rejected: {
    label: 'Rejected',
    variant: 'destructive',
    className: 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 border-red-200 dark:border-red-800',
    icon: XCircle,
  },
  expired: {
    label: 'Expired',
    variant: 'destructive',
    className: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-red-300 dark:border-red-800',
    icon: AlertTriangle,
  },
  active: {
    label: 'Active',
    variant: 'outline',
    className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    icon: CheckCircle2,
  },
  inactive: {
    label: 'Inactive',
    variant: 'secondary',
    className: 'bg-muted text-muted-foreground border-border',
    icon: Archive,
  },
  locked: {
    label: 'Locked',
    variant: 'outline',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300',
    icon: Lock,
  },
}

export function StatusBadge({
  status,
  label,
  className,
  showIcon = true,
  size = 'md',
}: StatusBadgeProps) {
  const normalizedKey = (status || '').toLowerCase().replace(/[\s-]/g, '_')
  const config = statusConfig[normalizedKey] || {
    label: label || status || 'Unknown',
    variant: 'outline' as const,
    className: 'bg-muted text-muted-foreground border-border',
    icon: Clock,
  }

  const Icon = config.icon
  const displayLabel = label || config.label

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
    lg: 'text-sm px-3 py-1.5 gap-2 font-semibold',
  }

  return (
    <Badge
      variant={config.variant}
      className={cn(
        'inline-flex items-center rounded-full border transition-colors shadow-xs',
        config.className,
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <Icon className={cn('h-3.5 w-3.5 shrink-0', size === 'sm' && 'h-3 w-3')} />}
      <span className="capitalize">{displayLabel}</span>
    </Badge>
  )
}
