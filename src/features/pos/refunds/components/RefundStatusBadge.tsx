import React from 'react'
import { Badge } from '@/components/ui/badge'
import type { refund_status_enum } from '@/generated/prisma/enums'
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  FileEdit,
  ShieldAlert,
} from 'lucide-react'

interface RefundStatusBadgeProps {
  status: refund_status_enum
  className?: string
}

export function RefundStatusBadge({ status, className }: RefundStatusBadgeProps) {
  switch (status) {
    case 'draft':
      return (
        <Badge variant="outline" className={`bg-muted/50 text-muted-foreground border-border gap-1 font-medium ${className}`}>
          <FileEdit className="w-3 h-3" />
          Draft
        </Badge>
      )
    case 'requested':
      return (
        <Badge variant="outline" className={`bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900 gap-1 font-medium ${className}`}>
          <Clock className="w-3 h-3" />
          Requested
        </Badge>
      )
    case 'pending_approval':
      return (
        <Badge variant="outline" className={`bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-800 gap-1 font-medium animate-pulse ${className}`}>
          <ShieldAlert className="w-3 h-3" />
          Pending Approval
        </Badge>
      )
    case 'approved':
      return (
        <Badge variant="outline" className={`bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900 gap-1 font-medium ${className}`}>
          <CheckCircle2 className="w-3 h-3" />
          Approved
        </Badge>
      )
    case 'processing':
      return (
        <Badge variant="outline" className={`bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900 gap-1 font-medium ${className}`}>
          <Loader2 className="w-3 h-3 animate-spin" />
          Processing
        </Badge>
      )
    case 'completed':
      return (
        <Badge variant="outline" className={`bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 gap-1 font-semibold ${className}`}>
          <CheckCircle2 className="w-3 h-3" />
          Completed
        </Badge>
      )
    case 'rejected':
      return (
        <Badge variant="outline" className={`bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900 gap-1 font-medium ${className}`}>
          <XCircle className="w-3 h-3" />
          Rejected
        </Badge>
      )
    case 'failed':
      return (
        <Badge variant="destructive" className={`gap-1 font-medium ${className}`}>
          <AlertCircle className="w-3 h-3" />
          Failed
        </Badge>
      )
    case 'cancelled':
      return (
        <Badge variant="secondary" className={`text-muted-foreground gap-1 font-medium ${className}`}>
          <XCircle className="w-3 h-3" />
          Cancelled
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className={className}>
          {status}
        </Badge>
      )
  }
}
