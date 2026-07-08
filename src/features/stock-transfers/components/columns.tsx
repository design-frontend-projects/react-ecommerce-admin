import { type ColumnDef } from '@tanstack/react-table'
import { ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table'
import { TransferRowActions } from './row-actions'
import type { TransferListItem, TransferStatus } from '../data/schema'

const STATUS_VARIANT: Record<
  TransferStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  draft: 'outline',
  in_transit: 'secondary',
  received: 'default',
  cancelled: 'destructive',
}

export const columns: ColumnDef<TransferListItem>[] = [
  {
    accessorKey: 'reference_no',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Reference' />
    ),
    cell: ({ row }) => (
      <span className='font-medium'>
        {row.original.reference_no || row.original.id.slice(0, 8)}
      </span>
    ),
  },
  {
    id: 'route',
    header: 'From → To',
    cell: ({ row }) => (
      <div className='flex items-center gap-2 text-sm'>
        <span>{row.original.from_store?.name ?? '—'}</span>
        <ArrowRight className='h-3.5 w-3.5 text-muted-foreground' />
        <span>{row.original.to_store?.name ?? '—'}</span>
      </div>
    ),
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
      <Badge variant={STATUS_VARIANT[row.original.status]} className='capitalize'>
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
