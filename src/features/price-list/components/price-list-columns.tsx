import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { PriceListItem } from '../hooks/use-price-list'
import { PriceListRowActions } from './price-list-row-actions'

export const columns: ColumnDef<PriceListItem>[] = [
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
    accessorFn: (row) => row.products?.name || 'N/A',
    id: 'product_name',
    header: 'Product',
    cell: ({ row }) => (
      <div className='font-medium'>{row.getValue('product_name')}</div>
    ),
  },
  {
    accessorKey: 'price',
    header: 'Price',
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('price'))
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(amount)
      return <div className='font-medium'>{formatted}</div>
    },
  },
  {
    accessorKey: 'is_active',
    header: 'Status',
    cell: ({ row }) => (
      <Badge variant={row.getValue('is_active') ? 'default' : 'secondary'}>
        {row.getValue('is_active') ? 'Active' : 'Inactive'}
      </Badge>
    ),
  },
  {
    accessorKey: 'start_date',
    header: 'Start Date',
  },
  {
    accessorKey: 'end_date',
    header: 'End Date',
  },
  {
    id: 'actions',
    cell: ({ row }) => <PriceListRowActions row={row} />,
  },
]
