import { type ColumnDef } from '@tanstack/react-table'
import type { TFunction } from 'i18next'
import i18n from '@/config/i18n'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table'
import { Globe, MapPin, Store, Building, Layers } from 'lucide-react'
import type { WarehouseListItem } from '../data/schema'
import { WarehouseRowActions } from './row-actions'

export interface ColumnOptions {
  onOpenLocations?: (warehouse: WarehouseListItem) => void
}

export const getColumns = (
  t: TFunction = i18n.t,
  options?: ColumnOptions
): ColumnDef<WarehouseListItem>[] => [
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
    accessorKey: 'code',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('warehouses.columns.code', 'Code')}
      />
    ),
    cell: ({ row }) => (
      <Badge variant='outline' className='font-mono font-bold tracking-wider'>
        {row.original.code}
      </Badge>
    ),
  },
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('warehouses.columns.name', 'Warehouse Name')}
      />
    ),
    cell: ({ row }) => {
      const warehouse = row.original
      return (
        <div className='flex flex-col gap-0.5 max-w-[220px]'>
          <span className='font-semibold text-sm truncate'>{warehouse.name}</span>
          {warehouse.address && (
            <span className='text-xs text-muted-foreground truncate flex items-center gap-1'>
              <MapPin className='h-3 w-3 shrink-0' />
              {warehouse.address}
            </span>
          )}
        </div>
      )
    },
  },
  {
    id: 'country',
    accessorFn: (row) => row.countries?.name ?? '',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('warehouses.columns.country', 'Country')}
      />
    ),
    cell: ({ row }) => {
      const country = row.original.countries
      if (!country?.name) return <span className='text-muted-foreground'>—</span>
      return (
        <div className='flex items-center gap-1.5 text-sm'>
          <Globe className='h-3.5 w-3.5 text-muted-foreground shrink-0' />
          <span>{country.name}</span>
          {country.code && (
            <span className='text-[10px] text-muted-foreground font-mono uppercase'>
              ({country.code})
            </span>
          )}
        </div>
      )
    },
  },
  {
    id: 'city',
    accessorFn: (row) => row.cities?.name ?? '',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('warehouses.columns.city', 'City')}
      />
    ),
    cell: ({ row }) => {
      const city = row.original.cities
      if (!city?.name) return <span className='text-muted-foreground'>—</span>
      return <span className='text-sm'>{city.name}</span>
    },
  },
  {
    id: 'facility',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('warehouses.columns.branch', 'Facility Link')}
      />
    ),
    cell: ({ row }) => {
      const branch = row.original.branches
      const store = row.original.stores
      if (!branch && !store) {
        return <span className='text-muted-foreground text-xs'>—</span>
      }
      return (
        <div className='flex flex-col gap-1'>
          {branch?.name && (
            <span className='inline-flex items-center gap-1 text-xs text-muted-foreground'>
              <Building className='h-3 w-3 text-blue-500 shrink-0' />
              {branch.name}
            </span>
          )}
          {store?.name && (
            <span className='inline-flex items-center gap-1 text-xs text-muted-foreground'>
              <Store className='h-3 w-3 text-amber-500 shrink-0' />
              {store.name}
            </span>
          )}
        </div>
      )
    },
  },
  {
    id: 'locations',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('warehouses.columns.locationsCount', 'Locations')}
      />
    ),
    cell: ({ row }) => {
      const count = row.original._count?.warehouse_locations ?? 0
      return (
        <button
          type='button'
          onClick={() => options?.onOpenLocations?.(row.original)}
          className='inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors hover:bg-accent/60 focus:outline-hidden'
          title='Manage storage locations'
        >
          <Layers className='h-3 w-3 text-violet-500' />
          <span>{count}</span>
        </button>
      )
    },
  },
  {
    id: 'policy',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('warehouses.columns.policy', 'Stock Policy')}
      />
    ),
    cell: ({ row }) => {
      const allowNeg = row.original.allow_negative_stock
      return allowNeg ? (
        <Badge variant='outline' className='border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10 text-[11px]'>
          {t('warehouses.columns.allowNegative', 'Allow Negative')}
        </Badge>
      ) : (
        <Badge variant='outline' className='text-[11px] text-muted-foreground'>
          {t('warehouses.columns.strictStock', 'Strict Stock')}
        </Badge>
      )
    },
  },
  {
    id: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('warehouses.columns.status', 'Status')}
      />
    ),
    cell: ({ row }) => {
      const warehouse = row.original
      return (
        <div className='flex flex-wrap items-center gap-1'>
          {warehouse.is_default && (
            <Badge variant='secondary' className='text-[11px]'>
              {t('warehouses.columns.default', 'Default')}
            </Badge>
          )}
          <Badge
            variant={warehouse.is_active ? 'default' : 'destructive'}
            className='text-[11px]'
          >
            {warehouse.is_active
              ? t('warehouses.columns.active', 'Active')
              : t('warehouses.columns.inactive', 'Inactive')}
          </Badge>
        </div>
      )
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => <WarehouseRowActions row={row.original} />,
  },
]

export const columns = getColumns()
