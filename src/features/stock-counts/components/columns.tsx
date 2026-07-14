import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table'
import type { CountListItem, CountStatus } from '../data/schema'
import { CountRowActions } from './row-actions'

const STATUS_VARIANT: Record<
  CountStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  draft: 'outline',
  counting: 'secondary',
  review: 'secondary',
  posted: 'default',
  cancelled: 'destructive',
}

export const columns: ColumnDef<CountListItem>[] = [
  {
    accessorKey: 'count_number',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Count #' />
    ),
    cell: ({ row }) => (
      <span className='font-medium'>{row.original.count_number}</span>
    ),
  },
  {
    id: 'store',
    header: 'Store',
    cell: ({ row }) => row.original.stores?.name ?? '—',
  },
  {
    id: 'scope',
    header: 'Scope',
    cell: ({ row }) =>
      row.original.warehouse_location_id ? 'Location' : 'Store-wide',
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Status' />
    ),
    cell: ({ row }) => (
      <div className='flex items-center gap-1'>
        <Badge
          variant={STATUS_VARIANT[row.original.status]}
          className='capitalize'
        >
          {row.original.status}
        </Badge>
        {row.original.is_blind ? <Badge variant='outline'>Blind</Badge> : null}
      </div>
    ),
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: 'snapshot_at',
    header: 'Snapshot',
    cell: ({ row }) =>
      row.original.snapshot_at
        ? new Date(row.original.snapshot_at).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })
        : '—',
  },
  {
    id: 'items',
    header: 'Items',
    cell: ({ row }) => row.original._count?.stock_count_items ?? 0,
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
    cell: ({ row }) => <CountRowActions row={row.original} />,
  },
]
