import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table'
import type { ReceiptListItem, ReceiptStatus } from '../data/schema'
import { ReceiptRowActions } from './row-actions'

const STATUS_VARIANT: Record<
  ReceiptStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  draft: 'outline',
  posted: 'default',
  cancelled: 'destructive',
}

export const columns: ColumnDef<ReceiptListItem>[] = [
  {
    accessorKey: 'receipt_number',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Receipt #' />
    ),
    cell: ({ row }) => (
      <span className='font-medium'>{row.original.receipt_number}</span>
    ),
  },
  {
    id: 'store',
    header: 'Store',
    cell: ({ row }) => row.original.stores?.name ?? '—',
  },
  {
    id: 'purchase_order',
    header: 'PO #',
    cell: ({ row }) =>
      row.original.purchase_order_id !== null
        ? `PO-${String(row.original.purchase_order_id).padStart(4, '0')}`
        : '—',
  },
  {
    id: 'supplier',
    header: 'Supplier',
    cell: ({ row }) => row.original.suppliers?.name ?? '—',
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
    accessorKey: 'received_date',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Received' />
    ),
    cell: ({ row }) =>
      new Date(row.original.received_date).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
  },
  {
    id: 'items',
    header: 'Items',
    cell: ({ row }) => row.original._count?.goods_receipt_items ?? 0,
  },
  {
    id: 'actions',
    cell: ({ row }) => <ReceiptRowActions row={row.original} />,
  },
]
