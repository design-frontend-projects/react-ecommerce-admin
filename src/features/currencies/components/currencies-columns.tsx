import { ColumnDef } from '@tanstack/react-table'
import { Check, Minus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { Currency } from '../hooks/use-currencies'
import { CurrencyRowActions } from './currency-row-actions'

export const columns: ColumnDef<Currency>[] = [
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
    accessorKey: 'code',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Code' />
    ),
    cell: ({ row }) => (
      <Badge variant='outline'>{row.getValue('code')}</Badge>
    ),
  },
  {
    accessorKey: 'symbol',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Symbol' />
    ),
    cell: ({ row }) => <div>{row.getValue('symbol')}</div>,
  },
  {
    accessorKey: 'is_active',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Status' />
    ),
    cell: ({ row }) => {
      const isActive = row.getValue('is_active')
      return (
        <Badge variant={isActive ? 'default' : 'secondary'}>
          {isActive ? (
            <Check className='mr-1 h-3 w-3' />
          ) : (
            <Minus className='mr-1 h-3 w-3' />
          )}
          {isActive ? 'Active' : 'Inactive'}
        </Badge>
      )
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => <CurrencyRowActions row={row} />,
  },
]
