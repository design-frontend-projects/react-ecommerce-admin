import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table'
import type { CustomerReturnListItem, CustomerReturnStatus } from '../data/schema'
import { CustomerReturnRowActions } from './row-actions'

const STATUS_VARIANT: Record<
  CustomerReturnStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  draft: 'outline',
  approved: 'secondary',
  received: 'secondary',
  completed: 'default',
  cancelled: 'destructive',
}

export const columns: ColumnDef<CustomerReturnListItem>[] = [
  {
    accessorKey: 'return_no',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Return #' />
    ),
    cell: ({ row }) => (
      <span className='font-mono font-medium'>{row.original.return_no}</span>
    ),
  },
  {
    id: 'warehouse',
    header: 'Warehouse',
    cell: ({ row }) =>
      row.original.warehouses
        ? `${row.original.warehouses.name} (${row.original.warehouses.code})`
        : '—',
  },
  {
    id: 'customer',
    header: 'Customer',
    cell: ({ row }) => {
      const c = row.original.customers
      if (!c) return '—'
      const name = [c.first_name, c.last_name].filter(Boolean).join(' ')
      return name || c.phone || 'Customer'
    },
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
        {row.original.status}
      </Badge>
    ),
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: 'reason',
    header: 'Reason',
    cell: ({ row }) => row.original.reason ?? '—',
  },
  {
    accessorKey: 'returned_at',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Returned Date' />
    ),
    cell: ({ row }) =>
      new Date(row.original.returned_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
  },
  {
    id: 'actions',
    cell: ({ row }) => <CustomerReturnRowActions row={row.original} />,
  },
]
