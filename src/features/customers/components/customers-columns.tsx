import { type ColumnDef } from '@tanstack/react-table'
import { type TFunction } from 'i18next'
import i18n from '@/config/i18n'
import { Checkbox } from '@/components/ui/checkbox'
import { type Customer } from '../hooks/use-customers'
import { CustomerRowActions } from './customer-row-actions'

export const getColumns = (t: TFunction = i18n.t): ColumnDef<Customer>[] => [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label={t('common.selectAll', 'Select all')}
        className='translate-y-[2px]'
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label={t('common.selectRow', 'Select row')}
        className='translate-y-[2px]'
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorFn: (row) => `${row.first_name} ${row.last_name}`,
    id: 'name',
    header: t('customers.columns.name', 'Customer Name'),
    cell: ({ row }) => (
      <div className='font-medium'>{row.getValue('name')}</div>
    ),
    enableSorting: true,
  },
  {
    accessorKey: 'email',
    header: t('customers.columns.email', 'Email'),
  },
  {
    accessorKey: 'phone',
    header: t('customers.columns.phone', 'Phone'),
  },
  {
    accessorKey: 'created_at',
    header: t('customers.columns.joined', 'Joined'),
    cell: ({ row }) =>
      new Date(row.getValue('created_at')).toLocaleDateString(),
  },
  {
    id: 'actions',
    cell: ({ row }) => <CustomerRowActions row={row} />,
  },
]

export const columns: ColumnDef<Customer>[] = getColumns()

