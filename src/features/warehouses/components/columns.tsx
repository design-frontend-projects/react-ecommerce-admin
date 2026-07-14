import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table'
import type { WarehouseListItem } from '../data/schema'
import { WarehouseRowActions } from './row-actions'

export const columns: ColumnDef<WarehouseListItem>[] = [
  {
    accessorKey: 'code',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Code' />
    ),
    cell: ({ row }) => <span className='font-medium'>{row.original.code}</span>,
  },
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Name' />
    ),
  },
  {
    id: 'store',
    header: 'Store',
    cell: ({ row }) => row.original.stores?.name ?? '—',
  },
  {
    id: 'branch',
    header: 'Branch',
    cell: ({ row }) => row.original.branches?.name ?? '—',
  },
  {
    id: 'locations',
    header: 'Locations',
    cell: ({ row }) => row.original._count?.warehouse_locations ?? 0,
  },
  {
    id: 'flags',
    header: 'Status',
    cell: ({ row }) => (
      <div className='flex gap-1'>
        {row.original.is_default ? (
          <Badge variant='secondary'>Default</Badge>
        ) : null}
        <Badge variant={row.original.is_active ? 'default' : 'destructive'}>
          {row.original.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </div>
    ),
  },
  {
    id: 'actions',
    cell: ({ row }) => <WarehouseRowActions row={row.original} />,
  },
]
