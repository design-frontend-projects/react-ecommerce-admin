import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table'
import { LongText } from '@/components/long-text'
import { type Inventory } from '../data/schema'
import { InventoryRowActions } from './inventory-row-actions'

export const columns: ColumnDef<Inventory>[] = [
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
      <DataTableColumnHeader column={column} title='Product Name' />
    ),
    cell: ({ row }) => (
      <LongText className='max-w-48 font-medium'>
        {row.original.products?.name || 'Unknown Product'}
      </LongText>
    ),
  },
  {
    accessorKey: 'location',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Location' />
    ),
    cell: ({ row }) => (
      <div className='text-sm text-muted-foreground'>
        {row.getValue('location') || 'N/A'}
      </div>
    ),
  },
  {
    accessorKey: 'quantity',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Quantity' />
    ),
    cell: ({ row }) => {
      const quantity = parseInt(row.getValue('quantity'))
      return <div className='font-medium'>{quantity}</div>
    },
  },
  {
    id: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Status' />
    ),
    cell: ({ row }) => {
      const quantity = row.original.quantity
      const minStock = row.original.reorder_level || 0

      let status: 'default' | 'destructive' | 'secondary' | 'outline' =
        'default'
      let text = 'In Stock'

      if (quantity === 0) {
        status = 'destructive'
        text = 'Out of Stock'
      } else if (quantity <= minStock) {
        status = 'secondary' // Using secondary for low stock warning
        text = 'Low Stock'
      }

      return <Badge variant={status}>{text}</Badge>
    },
  },
  {
    accessorKey: 'last_restocked',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Last Restocked' />
    ),
    cell: ({ row }) => {
      const dateStr = row.getValue('last_restocked') as string | null
      if (!dateStr) return <div className='text-muted-foreground'>Never</div>
      return (
        <div className='text-sm'>{new Date(dateStr).toLocaleDateString()}</div>
      )
    },
  },
  {
    id: 'actions',
    cell: InventoryRowActions,
  },
]
