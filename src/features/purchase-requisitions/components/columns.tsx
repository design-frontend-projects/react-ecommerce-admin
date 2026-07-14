import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table'
import type { RequisitionListItem, RequisitionStatus } from '../data/schema'
import { RequisitionRowActions } from './row-actions'

const STATUS_BADGE: Record<
  RequisitionStatus,
  {
    variant: 'default' | 'secondary' | 'destructive' | 'outline'
    className?: string
  }
> = {
  draft: { variant: 'outline' },
  submitted: { variant: 'secondary' },
  approved: { variant: 'default' },
  rejected: { variant: 'destructive' },
  converted: {
    variant: 'default',
    className: 'bg-emerald-600 hover:bg-emerald-600/90',
  },
  cancelled: { variant: 'outline', className: 'text-muted-foreground' },
}

export const columns: ColumnDef<RequisitionListItem>[] = [
  {
    accessorKey: 'requisition_number',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Requisition #' />
    ),
    cell: ({ row }) => (
      <span className='font-medium'>{row.original.requisition_number}</span>
    ),
  },
  {
    id: 'store',
    header: 'Store',
    cell: ({ row }) => row.original.stores?.name ?? '—',
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Status' />
    ),
    cell: ({ row }) => {
      const badge = STATUS_BADGE[row.original.status]
      return (
        <Badge
          variant={badge.variant}
          className={`capitalize ${badge.className ?? ''}`}
        >
          {row.original.status}
        </Badge>
      )
    },
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: 'source',
    header: 'Source',
    cell: ({ row }) => (
      <Badge
        variant={
          row.original.source === 'reorder_engine' ? 'secondary' : 'outline'
        }
      >
        {row.original.source === 'reorder_engine' ? 'Reorder engine' : 'Manual'}
      </Badge>
    ),
  },
  {
    accessorKey: 'needed_by',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Needed by' />
    ),
    cell: ({ row }) =>
      row.original.needed_by
        ? new Date(row.original.needed_by).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })
        : '—',
  },
  {
    id: 'items',
    header: 'Items',
    cell: ({ row }) => row.original._count?.purchase_requisition_items ?? 0,
  },
  {
    id: 'actions',
    cell: ({ row }) => <RequisitionRowActions row={row.original} />,
  },
]
