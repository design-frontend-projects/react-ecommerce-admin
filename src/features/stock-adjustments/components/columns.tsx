import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table'
import type { AdjustmentListItem, AdjustmentStatus } from '../data/schema'
import { AdjustmentRowActions } from './row-actions'

const STATUS_VARIANT: Record<
  AdjustmentStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  draft: 'outline',
  pending: 'secondary',
  approved: 'default',
  cancelled: 'destructive',
}

export const columns: ColumnDef<AdjustmentListItem>[] = [
  {
    accessorKey: 'id',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Reference' />
    ),
    cell: ({ row }) => (
      <span className='font-medium'>{row.original.id.slice(0, 8)}</span>
    ),
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => (
      <Badge variant='outline' className='capitalize'>
        {row.original.type}
      </Badge>
    ),
  },
  {
    id: 'store',
    header: 'Store',
    cell: ({ row }) => row.original.stores?.name ?? '—',
  },
  {
    id: 'items',
    header: 'Items',
    cell: ({ row }) => row.original._count?.stock_adjustment_items ?? 0,
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Status' />
    ),
    cell: ({ row }) => (
      <Badge
        variant={STATUS_VARIANT[row.original.status]}
        className='capitalize'
      >
        {row.original.status}
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
    cell: ({ row }) => <AdjustmentRowActions row={row.original} />,
  },
]
