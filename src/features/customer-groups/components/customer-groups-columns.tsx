import { type ColumnDef } from '@tanstack/react-table'
import { Checkbox } from '@/components/ui/checkbox'
import { type CustomerGroup } from '../hooks/use-customer-groups'
import { CustomerGroupRowActions } from './customer-groups-row-actions'

export const columns: ColumnDef<CustomerGroup>[] = [
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
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => (
      <div className='font-medium'>{row.getValue('name')}</div>
    ),
    enableSorting: true,
  },
  {
    accessorKey: 'description',
    header: 'Description',
  },
  {
    accessorKey: 'minimum_order_amount',
    header: 'Min. Order Amount',
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('minimum_order_amount')) || 0
      return (
        <div className='text-right font-medium'>
          {new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
          }).format(amount)}
        </div>
      )
    },
  },
  {
    accessorKey: 'discount_percentage',
    header: 'Discount (%)',
    cell: ({ row }) => (
      <div className='text-right font-medium'>
        {row.getValue('discount_percentage')}%
      </div>
    ),
  },
  {
    accessorKey: 'created_at',
    header: 'Created At',
    cell: ({ row }) =>
      new Date(row.getValue('created_at')).toLocaleDateString(),
  },
  {
    id: 'actions',
    cell: ({ row }) => <CustomerGroupRowActions row={row} />,
  },
]
