import { type ColumnDef } from '@tanstack/react-table'
import type { TFunction } from 'i18next'
import i18n from '@/config/i18n'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { Warehouse, Star } from 'lucide-react'
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
    id: 'fulfillment_hub',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('stores.columns.fulfillmentHub', 'Fulfillment Hub')}
      />
    ),
    cell: ({ row }) => {
      const store = row.original
      const linkedWarehouses: any[] = store.store_warehouses ?? []
      const defaultWh = linkedWarehouses.find((sw) => sw.is_default) || linkedWarehouses[0]
      const totalLinked = linkedWarehouses.length

      if (totalLinked === 0) {
        return (
          <span className='text-xs text-muted-foreground italic flex items-center gap-1'>
            <Warehouse className='h-3 w-3 opacity-50' />
            {t('stores.columns.noHub', 'Not linked')}
          </span>
        )
      }

      return (
        <div className='flex items-center gap-1.5'>
          <span className='inline-flex items-center gap-1 text-xs font-medium truncate max-w-[140px]'>
            {defaultWh?.is_default && (
              <Star className='h-3 w-3 text-amber-500 fill-amber-500 shrink-0' />
            )}
            <span className='truncate'>{defaultWh?.warehouses?.name || defaultWh?.warehouses?.code}</span>
          </span>
          {totalLinked > 1 && (
            <Badge variant='outline' className='text-[10px] px-1 py-0 font-mono'>
              +{totalLinked - 1}
            </Badge>
          )}
        </div>
      )
    },
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
