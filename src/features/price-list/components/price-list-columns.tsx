import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Users, Store as StoreIcon, Layers, Calendar, Clock, Coins, Radio } from 'lucide-react'
import {
  PRICE_LIST_TYPE_LABELS,
  type PriceList,
  type PriceListType,
} from '../data/schema'
import { PriceListRowActions } from './price-list-row-actions'

export const columns: ColumnDef<PriceList>[] = [
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
    accessorFn: (row) => row.name || row.products?.name || 'Standard Price List',
    id: 'price_list_name',
    header: 'Price List',
    cell: ({ row }) => {
      const name = row.original.name || row.original.products?.name || 'General Price List'
      const code = row.original.code
      const isDefault = row.original.is_default
      return (
        <div className='flex flex-col gap-0.5'>
          <div className='flex items-center gap-2'>
            <span className='font-semibold text-foreground'>{name}</span>
            {isDefault && (
              <Badge variant='default' className='text-[10px] px-1.5 py-0 bg-emerald-600 hover:bg-emerald-700 text-white'>
                Default
              </Badge>
            )}
          </div>
          <div className='flex items-center gap-2 text-xs text-muted-foreground'>
            {code && <span className='font-mono uppercase font-medium'>{code}</span>}
            {row.original.products && (
              <span>• Product: {row.original.products.name}</span>
            )}
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: 'type',
    header: 'Pricing Type',
    cell: ({ row }) => {
      const type = row.getValue('type') as PriceListType | null
      if (!type) {
        return <span className='text-xs text-muted-foreground'>Standard</span>
      }
      const config = PRICE_LIST_TYPE_LABELS[type]
      return (
        <Badge variant='outline' className={`text-xs capitalize font-medium ${config?.color || ''}`}>
          {config?.label || type}
        </Badge>
      )
    },
  },
  {
    id: 'scope',
    header: 'Scope',
    cell: ({ row }) => {
      const group = row.original.customer_groups
      const store = row.original.stores

      return (
        <div className='flex flex-col gap-1 items-start'>
          {group ? (
            <Badge variant='secondary' className='text-[11px] gap-1 px-1.5 py-0'>
              <Users className='h-3 w-3 text-muted-foreground' />
              {group.name}
            </Badge>
          ) : (
            <span className='text-[11px] text-muted-foreground'>All Groups</span>
          )}

          {store ? (
            <Badge variant='outline' className='text-[11px] gap-1 px-1.5 py-0'>
              <StoreIcon className='h-3 w-3 text-muted-foreground' />
              {store.name || 'Store'}
            </Badge>
          ) : (
            <span className='text-[11px] text-muted-foreground'>All Stores</span>
          )}
        </div>
      )
    },
  },
  {
    id: 'currency',
    header: 'Currency',
    cell: ({ row }) => {
      const currency = row.original.currencies
      if (!currency) {
        return <span className='text-[11px] text-muted-foreground'>Default</span>
      }
      return (
        <Badge variant='outline' className='text-[11px] gap-1 px-1.5 py-0'>
          <Coins className='h-3 w-3 text-muted-foreground' />
          {currency.symbol} {currency.code}
        </Badge>
      )
    },
  },
  {
    id: 'channel',
    header: 'Channel',
    cell: ({ row }) => {
      const channel = row.original.channels
      if (!channel) {
        return <span className='text-[11px] text-muted-foreground'>All</span>
      }
      return (
        <Badge variant='outline' className='text-[11px] gap-1 px-1.5 py-0'>
          <Radio className='h-3 w-3 text-muted-foreground' />
          {channel.name}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'price',
    header: 'Default Price',
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('price'))
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(amount)
      return <div className='font-bold text-primary'>{formatted}</div>
    },
  },
  {
    id: 'variants_count',
    header: 'Variant Rules',
    cell: ({ row }) => {
      const items = row.original.price_list_items || []
      return (
        <div className='flex items-center gap-1'>
          <Layers className='h-3.5 w-3.5 text-muted-foreground' />
          {items.length > 0 ? (
            <Badge variant='secondary' className='text-xs font-mono font-medium'>
              {items.length} priced
            </Badge>
          ) : (
            <span className='text-xs text-muted-foreground'>Default only</span>
          )}
        </div>
      )
    },
  },
  {
    id: 'validity',
    header: 'Validity Period',
    cell: ({ row }) => {
      const start = row.original.start_date
      const end = row.original.end_date

      const now = new Date()
      const startDate = start ? new Date(start) : null
      const endDate = end ? new Date(end) : null

      let validityStatus: 'active' | 'upcoming' | 'expired' = 'active'
      if (startDate && startDate > now) {
        validityStatus = 'upcoming'
      } else if (endDate && endDate < now) {
        validityStatus = 'expired'
      }

      return (
        <div className='flex flex-col gap-0.5'>
          <div className='flex items-center gap-1 text-xs font-mono'>
            <Calendar className='h-3 w-3 text-muted-foreground' />
            <span>{start}</span>
            <span className='text-muted-foreground'>→</span>
            <span>{end || 'Open'}</span>
          </div>
          <div>
            {validityStatus === 'active' ? (
              <span className='inline-flex items-center text-[10px] text-emerald-600 dark:text-emerald-400 font-medium'>
                ● In Effect
              </span>
            ) : validityStatus === 'upcoming' ? (
              <span className='inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium'>
                <Clock className='h-2.5 w-2.5' /> Upcoming
              </span>
            ) : (
              <span className='inline-flex items-center text-[10px] text-zinc-400 font-medium'>
                Expired
              </span>
            )}
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: 'is_active',
    header: 'Status',
    cell: ({ row }) => {
      const isActive = row.getValue('is_active') as boolean
      return (
        <Badge variant={isActive ? 'default' : 'secondary'}>
          {isActive ? 'Active' : 'Inactive'}
        </Badge>
      )
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => <PriceListRowActions row={row} />,
  },
]
