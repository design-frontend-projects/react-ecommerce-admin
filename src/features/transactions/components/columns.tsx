import { format } from 'date-fns'
import { type ColumnDef } from '@tanstack/react-table'
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  DollarSign,
  Eye,
  FileSpreadsheet,
  FileText,
  MoreHorizontal,
  RotateCcw,
  Scale,
  SlidersHorizontal,
  TrendingUp,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DataTableColumnHeader } from '@/components/data-table'
import type { FinancialTransactionRow } from '../data/schema'
import { useTransactionsContext } from './transactions-provider'

export function getTypeBadge(type: string) {
  switch (type) {
    case 'sale':
      return (
        <Badge className='border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20'>
          <ArrowDownLeft className='mr-1 h-3 w-3' />
          Sale
        </Badge>
      )
    case 'income':
      return (
        <Badge className='border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20'>
          <TrendingUp className='mr-1 h-3 w-3' />
          Income
        </Badge>
      )
    case 'payment_in':
      return (
        <Badge className='border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-400 hover:bg-teal-500/20'>
          <CreditCard className='mr-1 h-3 w-3' />
          Payment In
        </Badge>
      )
    case 'purchase':
      return (
        <Badge className='border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20'>
          <ArrowUpRight className='mr-1 h-3 w-3' />
          Purchase
        </Badge>
      )
    case 'expense':
      return (
        <Badge className='border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-500/20'>
          <DollarSign className='mr-1 h-3 w-3' />
          Expense
        </Badge>
      )
    case 'payment_out':
      return (
        <Badge className='border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-400 hover:bg-orange-500/20'>
          <ArrowUpRight className='mr-1 h-3 w-3' />
          Payment Out
        </Badge>
      )
    case 'refund':
      return (
        <Badge className='border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-400 hover:bg-purple-500/20'>
          <RotateCcw className='mr-1 h-3 w-3' />
          Refund
        </Badge>
      )
    case 'opening_balance':
      return (
        <Badge className='border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20'>
          <Scale className='mr-1 h-3 w-3' />
          Opening
        </Badge>
      )
    case 'adjustment':
      return (
        <Badge className='border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-400 hover:bg-slate-500/20'>
          <SlidersHorizontal className='mr-1 h-3 w-3' />
          Adjustment
        </Badge>
      )
    default:
      return <Badge variant='outline'>{type}</Badge>
  }
}

export function getStatusBadge(status: string) {
  switch (status) {
    case 'completed':
    case 'posted':
      return (
        <Badge className='border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/25'>
          <CheckCircle2 className='mr-1 h-3 w-3' />
          Completed
        </Badge>
      )
    case 'pending':
    case 'draft':
      return (
        <Badge className='border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-500/25'>
          <Clock className='mr-1 h-3 w-3' />
          Pending
        </Badge>
      )
    case 'refunded':
      return (
        <Badge className='border-purple-500/30 bg-purple-500/15 text-purple-700 dark:text-purple-400 hover:bg-purple-500/25'>
          <RotateCcw className='mr-1 h-3 w-3' />
          Refunded
        </Badge>
      )
    case 'partially_refunded':
      return (
        <Badge className='border-violet-500/30 bg-violet-500/15 text-violet-700 dark:text-violet-400 hover:bg-violet-500/25'>
          <RotateCcw className='mr-1 h-3 w-3' />
          Partial Refund
        </Badge>
      )
    case 'cancelled':
    case 'voided':
      return (
        <Badge className='border-slate-500/30 bg-slate-500/15 text-slate-700 dark:text-slate-400 hover:bg-slate-500/25'>
          <XCircle className='mr-1 h-3 w-3' />
          {status === 'voided' ? 'Voided' : 'Cancelled'}
        </Badge>
      )
    default:
      return <Badge variant='outline'>{status}</Badge>
  }
}

function CellActions({ row }: { row: FinancialTransactionRow }) {
  const { openDetail, openRefund, openStatusChange } = useTransactionsContext()

  const isPending = row.status === 'pending' || row.status === 'draft'
  const isCompleted = row.status === 'completed' || row.status === 'posted'
  const canRefund =
    isCompleted &&
    row.status !== 'refunded' &&
    ['sale', 'payment_in', 'income'].includes(row.transaction_type)

  return (
    <div className='text-right'>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' size='icon' className='h-8 w-8'>
            <MoreHorizontal className='h-4 w-4' />
            <span className='sr-only'>Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='w-48'>
          <DropdownMenuItem onClick={() => openDetail(row.id)}>
            <Eye className='mr-2 h-4 w-4' />
            View Details
          </DropdownMenuItem>

          {isPending && (
            <DropdownMenuItem
              onClick={() => openStatusChange(row, 'completed')}
              className='text-emerald-600 focus:text-emerald-600'
            >
              <CheckCircle2 className='mr-2 h-4 w-4' />
              Mark Completed
            </DropdownMenuItem>
          )}

          {canRefund && (
            <DropdownMenuItem
              onClick={() => openRefund(row)}
              className='text-purple-600 focus:text-purple-600'
            >
              <RotateCcw className='mr-2 h-4 w-4' />
              Issue Refund
            </DropdownMenuItem>
          )}

          {isPending && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => openStatusChange(row, 'cancelled')}
                className='text-destructive focus:text-destructive'
              >
                <XCircle className='mr-2 h-4 w-4' />
                Cancel Transaction
              </DropdownMenuItem>
            </>
          )}

          {isCompleted && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => openStatusChange(row, 'voided')}
                className='text-destructive focus:text-destructive'
              >
                <XCircle className='mr-2 h-4 w-4' />
                Void Transaction
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export const columns: ColumnDef<FinancialTransactionRow>[] = [
  {
    accessorKey: 'transaction_number',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Transaction #' />
    ),
    cell: ({ row }) => {
      const txNum = row.original.transaction_number
      const itemsCount = row.original.items_count

      return (
        <div className='flex items-center space-x-2'>
          <span className='font-mono font-medium text-xs sm:text-sm text-foreground'>
            {txNum}
          </span>
          <Button
            variant='ghost'
            size='icon'
            className='h-6 w-6 text-muted-foreground hover:text-foreground'
            onClick={() => {
              void navigator.clipboard.writeText(txNum)
              toast.success('Copied transaction number to clipboard')
            }}
          >
            <Copy className='h-3 w-3' />
          </Button>
          {itemsCount > 0 && (
            <Badge variant='outline' className='text-[10px] px-1.5 py-0'>
              {itemsCount} {itemsCount === 1 ? 'item' : 'items'}
            </Badge>
          )}
        </div>
      )
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'transaction_type',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Type' />
    ),
    cell: ({ row }) => getTypeBadge(row.original.transaction_type),
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Status' />
    ),
    cell: ({ row }) => getStatusBadge(row.original.status),
  },
  {
    id: 'references',
    header: 'References',
    cell: ({ row }) => {
      const inv = row.original.sales_invoice_id
      const ret = row.original.sales_return_id
      const ref = row.original.reference_transaction_id

      if (!inv && !ret && !ref) {
        return <span className='text-xs text-muted-foreground'>—</span>
      }

      return (
        <div className='flex flex-wrap gap-1'>
          {inv && (
            <Badge variant='secondary' className='text-[10px] gap-1 px-1.5'>
              <FileText className='h-3 w-3' />
              Invoice
            </Badge>
          )}
          {ret && (
            <Badge variant='secondary' className='text-[10px] gap-1 px-1.5'>
              <FileSpreadsheet className='h-3 w-3' />
              Return
            </Badge>
          )}
          {ref && (
            <Badge variant='outline' className='text-[10px] gap-1 px-1.5 border-purple-400/40 text-purple-600 dark:text-purple-400'>
              <RotateCcw className='h-3 w-3' />
              Ref Parent
            </Badge>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: 'total_amount',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Amount' />
    ),
    cell: ({ row }) => {
      const amount = row.original.total_amount
      const currency = row.original.currency || 'USD'

      try {
        const formatted = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency,
          maximumFractionDigits: 2,
        }).format(amount)

        return <div className='font-semibold text-foreground'>{formatted}</div>
      } catch {
        return (
          <div className='font-semibold text-foreground'>
            {currency} {amount.toFixed(2)}
          </div>
        )
      }
    },
  },
  {
    accessorKey: 'created_at',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Date & Author' />
    ),
    cell: ({ row }) => {
      const dateStr = row.original.created_at
      const author = row.original.created_by_name || 'System'

      return (
        <div className='text-xs space-y-0.5'>
          <div className='font-medium text-foreground'>
            {dateStr ? format(new Date(dateStr), 'MMM dd, yyyy HH:mm') : '—'}
          </div>
          <div className='text-muted-foreground'>{author}</div>
        </div>
      )
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => <CellActions row={row.original} />,
  },
]
