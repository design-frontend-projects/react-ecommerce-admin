import { type ColumnDef } from '@tanstack/react-table'
import { Check, Minus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { type Branch } from '../hooks/use-branches'
import { BranchRowActions } from './branch-row-actions'

export const columns: ColumnDef<Branch>[] = [
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
    id: 'city',
    header: 'City',
    cell: ({ row }) => {
      const branch = row.original
      return (
        <div className='flex space-x-2'>
          <span className='truncate'>
            {branch.cities?.name || '—'}
          </span>
        </div>
      )
    },
  },
  {
    id: 'country',
    header: 'Country',
    cell: ({ row }) => {
      const branch = row.original
      return (
        <div className='flex space-x-2'>
          <span className='truncate'>
            {branch.cities?.countries?.name || '—'}
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: 'phone',
    header: 'Phone',
    cell: ({ row }) => <div>{row.getValue('phone') || '—'}</div>,
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
    cell: ({ row }) => <BranchRowActions row={row} />,
  },
]
