import { ColumnDef } from '@tanstack/react-table'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { StoreStatusBadge } from './store-status-badge'
import { StoreRowActions } from './store-row-actions'

export const columns: ColumnDef<any>[] = [
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
      <div className='max-w-[200px] truncate font-medium'>
        {row.getValue('name')}
      </div>
    ),
  },
  {
    id: 'branch',
    header: 'Branch',
    cell: ({ row }) => {
      const store = row.original
      return (
        <span className='truncate text-muted-foreground'>
          {store.branches?.name || '—'}
        </span>
      )
    },
  },
  {
    id: 'city',
    header: 'City',
    cell: ({ row }) => {
      const store = row.original
      return (
        <span className='truncate'>
          {store.cities?.name || '—'}
        </span>
      )
    },
  },
  {
    id: 'country',
    header: 'Country',
    cell: ({ row }) => {
      const store = row.original
      return (
        <span className='truncate'>
          {store.cities?.countries?.name || store.countries?.name || '—'}
        </span>
      )
    },
  },
  {
    accessorKey: 'phone',
    header: 'Phone',
    cell: ({ row }) => <div>{row.getValue('phone') || '—'}</div>,
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Status' />
    ),
    cell: ({ row }) => <StoreStatusBadge status={row.getValue('status')} />,
  },
  {
    id: 'actions',
    cell: ({ row }) => <StoreRowActions row={row} />,
  },
]
