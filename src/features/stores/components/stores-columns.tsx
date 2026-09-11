import { type ColumnDef } from '@tanstack/react-table'
import type { TFunction } from 'i18next'
import i18n from '@/config/i18n'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { StoreRowActions } from './store-row-actions'
import { StoreStatusBadge } from './store-status-badge'

export const getColumns = (t: TFunction = i18n.t): ColumnDef<any>[] => [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label={t('stores.columns.selectAll', 'Select all')}
        className='translate-y-[2px]'
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label={t('stores.columns.selectRow', 'Select row')}
        className='translate-y-[2px]'
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('stores.columns.name', 'Name')}
      />
    ),
    cell: ({ row }) => (
      <div className='max-w-[200px] truncate font-medium'>
        {row.getValue('name')}
      </div>
    ),
  },
  {
    id: 'branch',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('stores.columns.branch', 'Branch')}
      />
    ),
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
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('stores.columns.city', 'City')}
      />
    ),
    cell: ({ row }) => {
      const store = row.original
      return <span className='truncate'>{store.cities?.name || '—'}</span>
    },
  },
  {
    id: 'country',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('stores.columns.country', 'Country')}
      />
    ),
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
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('stores.columns.phone', 'Phone')}
      />
    ),
    cell: ({ row }) => <div>{row.getValue('phone') || '—'}</div>,
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('stores.columns.status', 'Status')}
      />
    ),
    cell: ({ row }) => <StoreStatusBadge status={row.getValue('status')} />,
  },
  {
    id: 'actions',
    cell: ({ row }) => <StoreRowActions row={row} />,
  },
]

export const columns: ColumnDef<any>[] = getColumns()
