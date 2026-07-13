import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table'
import { RuleRowActions } from './row-actions'
import type { RuleListItem } from '../data/schema'

function formatQty(value: number | null): string {
  return value === null ? '—' : String(value)
}

export const columns: ColumnDef<RuleListItem>[] = [
  {
    id: 'product',
    header: 'Product',
    cell: ({ row }) => {
      const variant = row.original.product_variants
      if (!variant) return '—'
      return (
        <span className='font-medium'>
          {variant.products?.name
            ? `${variant.sku} — ${variant.products.name}`
            : variant.sku}
        </span>
      )
    },
  },
  {
    id: 'store',
    header: 'Store',
    cell: ({ row }) => row.original.stores?.name ?? '—',
  },
  {
    accessorKey: 'reorder_point',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Reorder point' />
    ),
    cell: ({ row }) => row.original.reorder_point,
  },
  {
    id: 'min_max',
    header: 'Min / Max',
    cell: ({ row }) =>
      `${formatQty(row.original.min_qty)} — ${formatQty(row.original.max_qty)}`,
  },
  {
    accessorKey: 'safety_stock',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Safety stock' />
    ),
    cell: ({ row }) => row.original.safety_stock,
  },
  {
    id: 'qty',
    header: 'Qty',
    cell: ({ row }) =>
      formatQty(row.original.reorder_qty ?? row.original.eoq),
  },
  {
    accessorKey: 'lead_time_days',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Lead time (days)' />
    ),
    cell: ({ row }) => row.original.lead_time_days ?? '—',
  },
  {
    id: 'supplier',
    header: 'Supplier',
    cell: ({ row }) => row.original.suppliers?.name ?? '—',
  },
  {
    accessorKey: 'is_active',
    header: 'Status',
    cell: ({ row }) => (
      <Badge variant={row.original.is_active ? 'default' : 'outline'}>
        {row.original.is_active ? 'Active' : 'Inactive'}
      </Badge>
    ),
  },
  {
    id: 'actions',
    cell: ({ row }) => <RuleRowActions row={row.original} />,
  },
]
