import { format } from 'date-fns'
import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table'
import { type TransactionRow } from '../data/schema'

export const columns: ColumnDef<TransactionRow>[] = [
  {
    accessorKey: 'transaction_number',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Transaction Number' />
    ),
    cell: ({ row }) => (
      <div className='font-medium'>{row.getValue('transaction_number')}</div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'type',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Type' />
    ),
    cell: ({ row }) => {
      const type = row.getValue('type') as string
      return (
        <Badge
          variant={
            type === 'sale'
              ? 'default'
              : type === 'refund'
                ? 'destructive'
                : 'outline'
          }
        >
          {type}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Status' />
    ),
    cell: ({ row }) => {
      const status = row.getValue('status') as string
      return (
        <Badge
          variant={
            status === 'completed'
              ? 'default'
              : status === 'pending'
                ? 'secondary'
                : 'destructive'
          }
        >
          {status}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'total',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Total' />
    ),
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('total'))
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(amount)
      return <div className='font-medium'>{formatted}</div>
    },
  },
  {
    accessorKey: 'date',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Date' />
    ),
    cell: ({ row }) => {
      return (
        <div>
          {format(new Date(row.getValue('date')), 'MMM dd, yyyy HH:mm')}
        </div>
      )
    },
  },
]
