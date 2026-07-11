import { type TFunction } from 'i18next'
import { type ColumnDef } from '@tanstack/react-table'
import { Checkbox } from '@/components/ui/checkbox'
import { type CustomerGroup } from '../hooks/use-customer-groups'
import { CustomerGroupRowActions } from './customer-groups-row-actions'

export const getColumns = (t: TFunction): ColumnDef<CustomerGroup>[] => [
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
    header: t('customerGroups.columns.name'),
    cell: ({ row }) => (
      <div className='font-medium'>{row.getValue('name')}</div>
    ),
    enableSorting: true,
  },
  {
    accessorKey: 'description',
    header: t('customerGroups.columns.description'),
  },
  {
    accessorKey: 'minimum_order_amount',
    header: t('customerGroups.columns.minOrderAmount'),
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
    header: t('customerGroups.columns.discount'),
    cell: ({ row }) => (
      <div className='text-right font-medium'>
        {row.getValue('discount_percentage')}%
      </div>
    ),
  },
  {
    accessorKey: 'created_at',
    header: t('customerGroups.columns.createdAt'),
    cell: ({ row }) =>
      new Date(row.getValue('created_at')).toLocaleDateString(),
  },
  {
    id: 'actions',
    cell: ({ row }) => <CustomerGroupRowActions row={row} />,
  },
]
