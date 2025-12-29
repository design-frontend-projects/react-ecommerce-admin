import { type ColumnDef } from '@tanstack/react-table'
import { Checkbox } from '@/components/ui/checkbox'
import { type Customer } from '../hooks/use-customers'
import { CustomerRowActions } from './customer-row-actions'

export const columns: ColumnDef<Customer>[] = [
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
    accessorFn: (row) => `${row.first_name} ${row.last_name}`,
    id: 'name',
    header: 'Name',
    cell: ({ row }) => (
      <div className='font-medium'>{row.getValue('name')}</div>
    ),
    enableSorting: true,
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    accessorKey: 'phone',
    header: 'Phone',
  },
  {
    accessorKey: 'created_at',
    header: 'Joined',
    cell: ({ row }) =>
      new Date(row.getValue('created_at')).toLocaleDateString(),
  },
  {
    id: 'actions',
    cell: ({ row }) => <CustomerRowActions row={row} />,
  },
]
