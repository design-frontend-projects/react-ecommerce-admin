import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table'
import type { StockBalanceRow } from '../data/schema'
import { StockBalancesRowActions } from './stock-balances-row-actions'

export const columns: ColumnDef<StockBalanceRow>[] = [
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
        className='translate-y-[2px]'
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label='Select row'
        className='translate-y-[2px]'
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: 'product_name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Product' />
    ),
    cell: ({ row }) => (
      <div className='flex flex-col'>
        <span className='font-medium'>
          {row.original.product_variants?.products?.name || 'Unknown Product'}
        </span>
        <span className='text-xs text-muted-foreground'>
          SKU: {row.original.product_variants?.sku || '—'}
        </span>
      </div>
    ),
    filterFn: (row, _id, filterValue: string) => {
      const name =
        row.original.product_variants?.products?.name?.toLowerCase() ?? ''
      const sku = row.original.product_variants?.sku?.toLowerCase() ?? ''
      const search = filterValue.toLowerCase()
      return name.includes(search) || sku.includes(search)
    },
  },
  {
    id: 'store_name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Store' />
    ),
    cell: ({ row }) => (
      <div className='text-sm'>
        {row.original.stores?.name || 'N/A'}
      </div>
    ),
    filterFn: (row, _id, filterValue: string) => {
      const name = row.original.stores?.name?.toLowerCase() ?? ''
      return name.includes(filterValue.toLowerCase())
    },
  },
  {
    accessorKey: 'qty_on_hand',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='On Hand' />
    ),
    cell: ({ row }) => {
      const qty = Number(row.getValue('qty_on_hand'))
      return <div className='font-mono font-semibold'>{qty.toLocaleString()}</div>
    },
  },
  {
    accessorKey: 'qty_reserved',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Reserved' />
    ),
    cell: ({ row }) => {
      const qty = Number(row.getValue('qty_reserved'))
      return <div className='font-mono text-muted-foreground'>{qty.toLocaleString()}</div>
    },
  },
  {
    accessorKey: 'qty_available',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Available' />
    ),
    cell: ({ row }) => {
      const qty = Number(row.getValue('qty_available') ?? 0)
      return <div className='font-mono font-semibold'>{qty.toLocaleString()}</div>
    },
  },
  {
    id: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Status' />
    ),
    cell: ({ row }) => {
      const qty = Number(row.original.qty_on_hand)

      let variant: 'default' | 'destructive' | 'secondary' | 'outline' =
        'default'
      let text = 'In Stock'

      if (qty <= 0) {
        variant = 'destructive'
        text = 'Out of Stock'
      } else if (qty <= 10) {
        variant = 'secondary'
        text = 'Low Stock'
      }

      return <Badge variant={variant}>{text}</Badge>
    },
  },
  {
    accessorKey: 'avg_cost',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Avg Cost' />
    ),
    cell: ({ row }) => {
      const cost = Number(row.getValue('avg_cost'))
      return (
        <div className='font-mono text-sm'>
          {cost > 0 ? `$${cost.toFixed(2)}` : '—'}
        </div>
      )
    },
  },
  {
    accessorKey: 'last_movement_at',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Last Movement' />
    ),
    cell: ({ row }) => {
      const dateStr = row.getValue('last_movement_at') as string | null
      if (!dateStr) return <div className='text-muted-foreground'>Never</div>
      return (
        <div className='text-sm'>
          {new Date(dateStr).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </div>
      )
    },
  },
  {
    id: 'actions',
    cell: StockBalancesRowActions,
  },
]
