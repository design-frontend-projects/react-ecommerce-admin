import { type ColumnDef } from '@tanstack/react-table'
import type { TFunction } from 'i18next'
import i18n from '@/config/i18n'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table'
import {
  Globe,
  MapPin,
  Store,
  Building,
  Layers,
  Boxes,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { WarehouseListItem } from '../data/schema'
import { WarehouseRowActions } from './row-actions'

export interface ColumnOptions {
  onOpenLocations?: (warehouse: WarehouseListItem) => void
  onOpenDetail?: (warehouse: WarehouseListItem) => void
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
        onClick={(e) => e.stopPropagation()}
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
      <Badge
        variant='outline'
        className='font-mono font-bold tracking-wider text-xs bg-muted/30'
      >
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
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className='flex flex-col gap-0.5 max-w-[240px] cursor-pointer'
                onClick={() => options?.onOpenDetail?.(warehouse)}
              >
                <span className='font-semibold text-sm truncate text-foreground hover:text-primary transition-colors'>
                  {warehouse.name}
                </span>
                {warehouse.address && (
                  <span className='text-xs text-muted-foreground truncate flex items-center gap-1'>
                    <MapPin className='h-3 w-3 shrink-0 text-muted-foreground/70' />
                    {warehouse.address}
                  </span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side='bottom' align='start' className='max-w-xs'>
              <p className='font-semibold'>{warehouse.name}</p>
              {warehouse.address && (
                <p className='text-[11px] text-primary-foreground/80 mt-0.5'>
                  {warehouse.address}
                </p>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
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
      const linkedStores = row.original.store_warehouses ?? []
      const firstStoreName = linkedStores[0]?.stores?.name ?? row.original.stores?.name
      const totalStores = linkedStores.length

      if (!branch && !firstStoreName) {
        return <span className='text-muted-foreground text-xs'>—</span>
      }
      return (
        <div className='flex flex-col gap-1 max-w-[160px]'>
          {branch?.name && (
            <span
              className='inline-flex items-center gap-1 text-xs text-muted-foreground truncate'
              title={branch.name}
            >
              <Building className='h-3 w-3 text-blue-500 shrink-0' />
              <span className='truncate'>{branch.name}</span>
            </span>
          )}
          {firstStoreName && (
            <span
              className='inline-flex items-center gap-1 text-xs text-muted-foreground truncate'
              title={linkedStores.map((sw) => sw.stores?.name).filter(Boolean).join(', ') || firstStoreName}
            >
              <Store className='h-3 w-3 text-amber-500 shrink-0' />
              <span className='truncate'>{firstStoreName}</span>
              {totalStores > 1 && (
                <span className='text-[10px] font-semibold text-primary/80'>
                  +{totalStores - 1}
                </span>
              )}
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
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type='button'
                onClick={(e) => {
                  e.stopPropagation()
                  options?.onOpenLocations?.(row.original)
                }}
                className='inline-flex items-center gap-1.5 rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-0.5 text-xs font-semibold text-violet-600 dark:text-violet-400 transition-colors hover:bg-violet-500/20 focus:outline-hidden cursor-pointer'
              >
                <Layers className='h-3 w-3 text-violet-500' />
                <span>{count}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side='top'>
              <p>{t('warehouses.manageLocations', 'Manage storage locations')}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    },
  },
  {
    id: 'stock',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('warehouses.columns.stockCount', 'Stock Items')}
      />
    ),
    cell: ({ row }) => {
      const count = row.original._count?.stock_balances ?? 0
      return (
        <div className='flex items-center gap-1.5 text-xs font-medium text-muted-foreground'>
          <Boxes className='h-3.5 w-3.5 text-blue-500' />
          <span>{count}</span>
        </div>
      )
    },
  },
  {
    id: 'policy',
    accessorFn: (row) => (row.allow_negative_stock ? 'allow_negative' : 'strict'),
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('warehouses.columns.policy', 'Stock Policy')}
      />
    ),
    cell: ({ row }) => {
      const allowNeg = row.original.allow_negative_stock
      return allowNeg ? (
        <Badge
          variant='outline'
          className='border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10 text-[11px] gap-1'
        >
          <ShieldAlert className='h-3 w-3' />
          {t('warehouses.columns.allowNegative', 'Allow Negative')}
        </Badge>
      ) : (
        <Badge
          variant='outline'
          className='text-[11px] text-muted-foreground gap-1 border-border'
        >
          <ShieldCheck className='h-3 w-3 text-emerald-500' />
          {t('warehouses.columns.strictStock', 'Strict Stock')}
        </Badge>
      )
    },
    filterFn: (row, id, value) => {
      return Array.isArray(value) && value.includes(row.getValue(id))
    },
  },
  {
    id: 'status',
    accessorFn: (row) => (row.is_active ? 'active' : 'inactive'),
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('warehouses.columns.status', 'Status')}
      />
    ),
    cell: ({ row }) => {
      const warehouse = row.original
      return (
        <div className='flex flex-wrap items-center gap-1.5'>
          {warehouse.is_default && (
            <Badge variant='secondary' className='text-[10px] font-semibold'>
              {t('warehouses.columns.default', 'Default')}
            </Badge>
          )}
          {warehouse.is_active ? (
            <span className='inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'>
              <span className='h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse' />
              {t('warehouses.columns.active', 'Active')}
            </span>
          ) : (
            <span className='inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive border border-destructive/20'>
              <span className='h-1.5 w-1.5 rounded-full bg-destructive' />
              {t('warehouses.columns.inactive', 'Inactive')}
            </span>
          )}
        </div>
      )
    },
    filterFn: (row, id, value) => {
      return Array.isArray(value) && value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: 'created_at',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('warehouses.columns.createdAt', 'Created')}
      />
    ),
    cell: ({ row }) => {
      const date = row.original.created_at
      if (!date) return <span className='text-muted-foreground text-xs'>—</span>
      const d = new Date(date)
      return (
        <span className='text-xs text-muted-foreground' title={d.toLocaleString()}>
          {d.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </span>
      )
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <div onClick={(e) => e.stopPropagation()}>
        <WarehouseRowActions row={row.original} />
      </div>
    ),
  },
]

export const columns = getColumns()

