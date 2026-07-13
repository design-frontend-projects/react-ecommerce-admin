import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table'
import { ReservationRowActions } from './row-actions'
import type { ReservationListItem, ReservationStatus } from '../data/schema'

const STATUS_VARIANT: Record<
  ReservationStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  active: 'default',
  consumed: 'secondary',
  released: 'outline',
  expired: 'destructive',
}

export const columns: ColumnDef<ReservationListItem>[] = [
  {
    id: 'product',
    accessorFn: (row) => row.product_variants?.sku ?? row.product_variant_id,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Product' />
    ),
    cell: ({ row }) => (
      <div className='flex flex-col'>
        <span className='font-medium'>
          {row.original.product_variants?.sku ??
            row.original.product_variant_id.slice(0, 8)}
        </span>
        {row.original.product_variants?.products?.name ? (
          <span className='text-xs text-muted-foreground'>
            {row.original.product_variants.products.name}
          </span>
        ) : null}
      </div>
    ),
  },
  {
    id: 'store',
    header: 'Store',
    cell: ({ row }) => row.original.stores?.name ?? '—',
  },
  {
    accessorKey: 'qty',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Qty' />,
    cell: ({ row }) => (
      <span className='tabular-nums'>{row.original.qty}</span>
    ),
  },
  {
    accessorKey: 'qty_consumed',
    header: 'Consumed',
    cell: ({ row }) => (
      <span className='tabular-nums'>{row.original.qty_consumed}</span>
    ),
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
    id: 'reference',
    header: 'Reference',
    cell: ({ row }) => (
      <span className='text-muted-foreground'>
        {row.original.reference_type}
        {row.original.reference_id
          ? ` · ${row.original.reference_id.slice(0, 8)}`
          : ''}
      </span>
    ),
  },
  {
    accessorKey: 'expires_at',
    header: 'Expires',
    cell: ({ row }) =>
      row.original.expires_at
        ? new Date(row.original.expires_at).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })
        : '—',
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
    cell: ({ row }) => <ReservationRowActions row={row.original} />,
  },
]
