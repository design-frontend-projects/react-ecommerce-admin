import { type ColumnDef } from '@tanstack/react-table'
import { Check, Minus, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { type PaymentMethod } from '../hooks/use-payment-methods'
import { PaymentMethodRowActions } from './payment-method-row-actions'

export const columns: ColumnDef<PaymentMethod>[] = [
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
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Name' />
    ),
    cell: ({ row }) => (
      <div className='max-w-[150px] truncate font-medium sm:max-w-[200px] md:max-w-none'>
        {row.getValue('name')}
      </div>
    ),
  },
  {
    accessorKey: 'icon',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Icon' />
    ),
    cell: ({ row }) => {
      const icon = row.getValue('icon') as string | null
      return (
        <div className='text-muted-foreground'>
          {icon || '—'}
        </div>
      )
    },
  },
  {
    accessorKey: 'is_enabled',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Status' />
    ),
    cell: ({ row }) => {
      const isEnabled = row.getValue('is_enabled')
      return (
        <Badge variant={isEnabled ? 'default' : 'secondary'}>
          {isEnabled ? (
            <Check className='mr-1 h-3 w-3' />
          ) : (
            <Minus className='mr-1 h-3 w-3' />
          )}
          {isEnabled ? 'Enabled' : 'Disabled'}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'is_default',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Default' />
    ),
    cell: ({ row }) => {
      const isDefault = row.getValue('is_default')
      return isDefault ? (
        <Badge variant='default' className='bg-amber-500 hover:bg-amber-600'>
          <Star className='mr-1 h-3 w-3 fill-current' />
          Default
        </Badge>
      ) : (
        <span className='text-muted-foreground'>—</span>
      )
    },
  },
  {
    accessorKey: 'sort_order',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Order' />
    ),
    cell: ({ row }) => <div>{row.getValue('sort_order')}</div>,
  },
  {
    id: 'actions',
    cell: ({ row }) => <PaymentMethodRowActions row={row} />,
  },
]
