import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table'
import type { SuggestionListItem, SuggestionStatus } from '../data/schema'
import { SuggestionRowActions } from './row-actions'

const STATUS_VARIANT: Record<
  SuggestionStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  open: 'default',
  converted: 'secondary',
  dismissed: 'outline',
  expired: 'destructive',
}

export const columns: ColumnDef<SuggestionListItem>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label='Select all'
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        disabled={!row.getCanSelect()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label='Select row'
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
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
    accessorKey: 'qty_available_at_run',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Available' />
    ),
    cell: ({ row }) => row.original.qty_available_at_run,
  },
  {
    accessorKey: 'qty_on_order_at_run',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='On order' />
    ),
    cell: ({ row }) => row.original.qty_on_order_at_run,
  },
  {
    accessorKey: 'suggested_qty',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Suggested' />
    ),
    cell: ({ row }) => (
      <span className='font-semibold'>{row.original.suggested_qty}</span>
    ),
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
    accessorKey: 'run_at',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Run at' />
    ),
    cell: ({ row }) =>
      new Date(row.original.run_at).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
  },
  {
    id: 'actions',
    cell: ({ row }) => <SuggestionRowActions row={row.original} />,
  },
]
