import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table'
import { UomRowActions } from './row-actions'
import type { UomListItem } from '../data/schema'

export const columns: ColumnDef<UomListItem>[] = [
  {
    accessorKey: 'code',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Code' />
    ),
    cell: ({ row }) => (
      <span className='font-medium'>{row.original.code}</span>
    ),
  },
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Name' />
    ),
  },
  {
    accessorKey: 'uom_category',
    header: 'Category',
    cell: ({ row }) => (
      <Badge variant='outline' className='capitalize'>
        {row.original.uom_category}
      </Badge>
    ),
  },
  {
    id: 'conversions',
    header: 'Conversions',
    cell: ({ row }) =>
      (row.original._count?.conversions_from ?? 0) +
      (row.original._count?.conversions_to ?? 0),
  },
  {
    id: 'flags',
    header: 'Status',
    cell: ({ row }) => (
      <div className='flex gap-1'>
        {row.original.is_base ? (
          <Badge variant='secondary'>Base</Badge>
        ) : null}
        <Badge variant={row.original.is_active ? 'default' : 'destructive'}>
          {row.original.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </div>
    ),
  },
  {
    id: 'actions',
    cell: ({ row }) => <UomRowActions row={row.original} />,
  },
]
