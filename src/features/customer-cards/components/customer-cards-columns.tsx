import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { type CustomerCard } from '../hooks/use-customer-cards'
import { CustomerCardRowActions } from './customer-cards-row-actions'

export const columns: ColumnDef<CustomerCard>[] = [
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
    id: 'customer_name',
    header: 'Customer',
    cell: ({ row }) => {
      const customer = row.original.customers
      return customer ? `${customer.first_name} ${customer.last_name}` : 'N/A'
    },
    enableSorting: true,
  },
  {
    accessorKey: 'cardholder_name',
    header: 'Cardholder Name',
  },
  {
    accessorKey: 'card_type',
    header: 'Card Type',
    cell: ({ row }) => {
      const type = row.original.card_type
      if (!type) return 'N/A'
      return type === 'visa'
        ? 'Visa'
        : type === 'master-card'
          ? 'MasterCard'
          : type === 'instapay'
            ? 'InstaPay'
            : type === 'paypal'
              ? 'PayPal'
              : type.charAt(0).toUpperCase() + type.slice(1)
    },
  },

  {
    accessorKey: 'last_four_digits',
    header: 'Last 4 Digits',
  },
  {
    id: 'expiry',
    header: 'Expiry',
    cell: ({ row }) =>
      `${row.original.expiry_month}/${row.original.expiry_year}`,
  },
  {
    accessorKey: 'is_default',
    header: 'Default',
    cell: ({ row }) =>
      row.original.is_default ? <Badge variant='outline'>Default</Badge> : null,
  },
  {
    id: 'actions',
    cell: ({ row }) => <CustomerCardRowActions row={row} />,
  },
]
