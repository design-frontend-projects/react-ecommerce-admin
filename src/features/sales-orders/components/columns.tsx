import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table'
import { OrderRowActions } from './row-actions'
import { customerName, type OrderListItem, type OrderStatus } from '../data/schema'

export const STATUS_CLASSES: Record<OrderStatus, string> = {
  draft: 'border-muted-foreground/40 text-muted-foreground',
  confirmed: 'border-sky-300 bg-sky-50 text-sky-700',
  picking: 'border-amber-300 bg-amber-50 text-amber-700',
  packed: 'border-violet-300 bg-violet-50 text-violet-700',
  delivered: 'border-cyan-300 bg-cyan-50 text-cyan-700',
  invoiced: 'border-indigo-300 bg-indigo-50 text-indigo-700',
  completed: 'border-emerald-300 bg-emerald-50 text-emerald-700',
  cancelled: 'border-rose-300 bg-rose-50 text-rose-700',
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge variant='outline' className={`capitalize ${STATUS_CLASSES[status]}`}>
      {status}
    </Badge>
  )
}

export const columns: ColumnDef<OrderListItem>[] = [
  {
    accessorKey: 'order_number',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Order #' />
    ),
    cell: ({ row }) => (
      <span className='font-medium'>{row.original.order_number}</span>
    ),
  },
  {
    id: 'customer',
    header: 'Customer',
    cell: ({ row }) => customerName(row.original.customers),
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
    cell: ({ row }) => <OrderStatusBadge status={row.original.status} />,
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: 'order_date',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Ordered' />
    ),
    cell: ({ row }) =>
      new Date(row.original.order_date).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
  },
  {
    accessorKey: 'total_amount',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Total' />
    ),
    cell: ({ row }) => (
      <span className='tabular-nums'>
        {row.original.total_amount.toFixed(2)}
      </span>
    ),
  },
  {
    id: 'items',
    header: 'Items',
    cell: ({ row }) => row.original._count?.sales_order_items ?? 0,
  },
  {
    id: 'actions',
    cell: ({ row }) => <OrderRowActions row={row.original} />,
  },
]
