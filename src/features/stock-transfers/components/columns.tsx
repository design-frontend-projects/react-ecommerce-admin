import { type ColumnDef } from '@tanstack/react-table'
import { ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table'
import type { TransferListItem, TransferStatus } from '../data/schema'
import { TransferRowActions } from './row-actions'

const STATUS_VARIANT: Record<
  TransferStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  draft: 'outline',
  approved: 'secondary',
  picked: 'secondary',
  in_transit: 'secondary',
  received: 'default',
  completed: 'default',
  cancelled: 'destructive',
}

export const columns: ColumnDef<TransferListItem>[] = [
  {
    accessorKey: 'reference_no',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Reference / No.' />
    ),
    cell: ({ row }) => (
      <div className='flex flex-col'>
        <span className='font-medium'>
          {row.original.reference_no || `TR-${row.original.id.slice(0, 8)}`}
        </span>
        {row.original.transfer_no && (
          <span className='text-xs text-muted-foreground'>
            #{row.original.transfer_no}
          </span>
        )}
      </div>
    ),
  },
  {
    id: 'route',
    header: 'From → To (Warehouse / Store)',
    cell: ({ row }) => {
      const fromName =
        row.original.source_warehouse?.name ??
        row.original.from_store?.name ??
        '—'
      const toName =
        row.original.destination_warehouse?.name ??
        row.original.to_store?.name ??
        '—'
      return (
        <div className='flex items-center gap-2 text-sm'>
          <span className='font-medium'>{fromName}</span>
          <ArrowRight className='h-3.5 w-3.5 text-muted-foreground shrink-0' />
          <span className='font-medium'>{toName}</span>
        </div>
      )
    },
  },
  {
    id: 'items',
    header: 'Items',
    cell: ({ row }) => row.original._count?.stock_transfer_items ?? 0,
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Status' />
    ),
    cell: ({ row }) => (
      <Badge
        variant={STATUS_VARIANT[row.original.status] ?? 'outline'}
        className='capitalize'
      >
        {row.original.status.replace('_', ' ')}
      </Badge>
    ),
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: 'created_at',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Created' />
    ),
    cell: ({ row }) =>
      new Date(row.original.created_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
  },
  {
    id: 'actions',
    cell: ({ row }) => <TransferRowActions row={row.original} />,
  },
]

