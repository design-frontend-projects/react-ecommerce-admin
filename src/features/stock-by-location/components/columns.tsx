import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table'
import type { StockByLocationRow } from '../data/schema'

function isExpired(date: string | null): boolean {
  return Boolean(date) && new Date(date as string) < new Date()
}

export const columns: ColumnDef<StockByLocationRow>[] = [
  {
    id: 'warehouse',
    header: 'Warehouse',
    cell: ({ row }) =>
      row.original.warehouses
        ? `${row.original.warehouses.code} — ${row.original.warehouses.name}`
        : '—',
  },
  {
    id: 'location',
    header: 'Location',
    cell: ({ row }) => (
      <div className='flex items-center gap-2'>
        <span className='font-mono text-xs'>
          {row.original.warehouse_locations?.path ??
            row.original.warehouse_locations?.code ??
            '—'}
        </span>
        {row.original.warehouse_locations ? (
          <Badge variant='outline' className='capitalize'>
            {row.original.warehouse_locations.location_type}
          </Badge>
        ) : null}
      </div>
    ),
  },
  {
    id: 'product',
    accessorFn: (row) => row.product_variants?.sku ?? '',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Product' />
    ),
    cell: ({ row }) => (
      <div>
        <span className='font-medium'>
          {row.original.product_variants?.sku ?? '—'}
        </span>
        {row.original.product_variants?.products?.name ? (
          <span className='ms-2 text-muted-foreground'>
            {row.original.product_variants.products.name}
          </span>
        ) : null}
      </div>
    ),
  },
  {
    id: 'batch',
    header: 'Batch',
    cell: ({ row }) =>
      row.original.product_batches ? (
        <div className='flex items-center gap-2'>
          <span>{row.original.product_batches.batch_number}</span>
          {isExpired(row.original.product_batches.expiry_date) ? (
            <Badge variant='destructive'>Expired</Badge>
          ) : null}
        </div>
      ) : (
        '—'
      ),
  },
  {
    accessorKey: 'qty_on_hand',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='On hand' />
    ),
    cell: ({ row }) => Number(row.original.qty_on_hand),
  },
  {
    accessorKey: 'qty_reserved',
    header: 'Reserved',
    cell: ({ row }) => Number(row.original.qty_reserved),
  },
  {
    accessorKey: 'last_movement_at',
    header: 'Last movement',
    cell: ({ row }) =>
      row.original.last_movement_at
        ? new Date(row.original.last_movement_at).toLocaleString()
        : '—',
  },
]
