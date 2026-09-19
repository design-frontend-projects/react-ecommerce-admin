import React from 'react'
import { Badge } from '@/components/ui/badge'
import type { InvoiceStatus, InvoicePaymentStatus, InvoiceType } from '../types'
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Ban,
  RotateCcw,
  Sparkles,
} from 'lucide-react'

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus
  className?: string
}

export const InvoiceStatusBadge: React.FC<InvoiceStatusBadgeProps> = ({ status, className }) => {
  switch (status) {
    case 'draft':
      return (
        <Badge variant="outline" className={`border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-400 gap-1 font-medium ${className}`}>
          <FileText className="w-3 h-3" />
          Draft
        </Badge>
      )
    case 'issued':
      return (
        <Badge variant="secondary" className={`bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800 gap-1 font-medium ${className}`}>
          <Clock className="w-3 h-3" />
          Issued
        </Badge>
      )
    case 'posted':
      return (
        <Badge className={`bg-indigo-600 text-white hover:bg-indigo-700 gap-1 font-medium ${className}`}>
          <Sparkles className="w-3 h-3" />
          Posted
        </Badge>
      )
    case 'partially_paid':
      return (
        <Badge className={`bg-amber-500 text-white hover:bg-amber-600 gap-1 font-medium ${className}`}>
          <Clock className="w-3 h-3" />
          Partially Paid
        </Badge>
      )
    case 'paid':
      return (
        <Badge className={`bg-emerald-600 text-white hover:bg-emerald-700 gap-1 font-medium ${className}`}>
          <CheckCircle2 className="w-3 h-3" />
          Paid
        </Badge>
      )
    case 'overdue':
      return (
        <Badge className={`bg-rose-600 text-white hover:bg-rose-700 gap-1 font-medium animate-pulse ${className}`}>
          <AlertCircle className="w-3 h-3" />
          Overdue
        </Badge>
      )
    case 'cancelled':
      return (
        <Badge variant="outline" className={`border-zinc-300 text-zinc-500 line-through dark:border-zinc-700 dark:text-zinc-400 gap-1 font-medium ${className}`}>
          <XCircle className="w-3 h-3" />
          Cancelled
        </Badge>
      )
    case 'void':
      return (
        <Badge variant="destructive" className={`bg-purple-900 text-purple-100 hover:bg-purple-900 gap-1 font-medium ${className}`}>
          <Ban className="w-3 h-3" />
          Voided
        </Badge>
      )
    case 'refunded':
      return (
        <Badge className={`bg-cyan-700 text-white hover:bg-cyan-800 gap-1 font-medium ${className}`}>
          <RotateCcw className="w-3 h-3" />
          Refunded
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

interface PaymentStatusBadgeProps {
  status: InvoicePaymentStatus
  className?: string
}

export const PaymentStatusBadge: React.FC<PaymentStatusBadgeProps> = ({ status, className }) => {
  switch (status) {
    case 'pending':
      return (
        <Badge variant="outline" className={`border-amber-400 text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 dark:text-amber-400 gap-1 font-medium ${className}`}>
          <Clock className="w-3 h-3" />
          Pending Payment
        </Badge>
      )
    case 'partially_paid':
      return (
        <Badge className={`bg-amber-600 text-white hover:bg-amber-700 gap-1 font-medium ${className}`}>
          <Clock className="w-3 h-3" />
          Partially Paid
        </Badge>
      )
    case 'paid':
      return (
        <Badge className={`bg-emerald-600 text-white hover:bg-emerald-700 gap-1 font-medium ${className}`}>
          <CheckCircle2 className="w-3 h-3" />
          Fully Paid
        </Badge>
      )
    case 'overpaid':
      return (
        <Badge className={`bg-teal-600 text-white hover:bg-teal-700 gap-1 font-medium ${className}`}>
          <CheckCircle2 className="w-3 h-3" />
          Overpaid
        </Badge>
      )
    case 'refunded':
      return (
        <Badge className={`bg-indigo-600 text-white hover:bg-indigo-700 gap-1 font-medium ${className}`}>
          <RotateCcw className="w-3 h-3" />
          Refunded
        </Badge>
      )
    default:
      return <Badge variant="outline" className={className}>{status}</Badge>
  }
}

interface InvoiceTypeBadgeProps {
  type: InvoiceType
  className?: string
}

export const InvoiceTypeBadge: React.FC<InvoiceTypeBadgeProps> = ({ type, className }) => {
  switch (type) {
    case 'sale':
      return (
        <Badge variant="outline" className={`border-blue-300 text-blue-700 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800 dark:text-blue-300 text-xs font-semibold uppercase ${className}`}>
          Sale
        </Badge>
      )
    case 'credit_note':
      return (
        <Badge variant="outline" className={`border-amber-300 text-amber-700 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800 dark:text-amber-300 text-xs font-semibold uppercase ${className}`}>
          Credit Note
        </Badge>
      )
    case 'debit_note':
      return (
        <Badge variant="outline" className={`border-purple-300 text-purple-700 bg-purple-50/50 dark:bg-purple-950/20 dark:border-purple-800 dark:text-purple-300 text-xs font-semibold uppercase ${className}`}>
          Debit Note
        </Badge>
      )
    case 'proforma':
      return (
        <Badge variant="outline" className={`border-zinc-300 text-zinc-600 bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300 text-xs font-semibold uppercase ${className}`}>
          Proforma
        </Badge>
      )
    case 'service':
      return (
        <Badge variant="outline" className={`border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-300 text-xs font-semibold uppercase ${className}`}>
          Service
        </Badge>
      )
    default:
      return <Badge variant="outline" className={className}>{type}</Badge>
  }
}
