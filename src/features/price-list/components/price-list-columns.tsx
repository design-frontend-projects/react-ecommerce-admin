import { type ColumnDef } from '@tanstack/react-table'
import i18n from '@/config/i18n'
import type { TFunction } from 'i18next'
import {
  Users,
  Store as StoreIcon,
  Layers,
  Calendar,
  Clock,
  Coins,
  Radio,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  PRICE_LIST_TYPE_LABELS,
  PRICE_SOURCE_LABELS,
  type PriceList,
  type PriceListType,
  type PriceSource,
} from '../data/schema'
import { getTaxRatePercentage } from '../utils/pricing-calculator'
import { PriceListRowActions } from './price-list-row-actions'

export const getColumns = (
  t: TFunction = i18n.t,
  isAr: boolean = i18n.language === 'ar'
): ColumnDef<PriceList>[] => [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label={t('common.selectAll', { defaultValue: 'Select all' })}
        className='translate-y-[2px]'
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label={t('common.selectRow', { defaultValue: 'Select row' })}
        className='translate-y-[2px]'
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorFn: (row) =>
      row.name ||
      row.products?.name ||
      t('priceList.standardPriceList', { defaultValue: 'Standard Price List' }),
    id: 'price_list_name',
    header: t('priceList.columns.priceList', { defaultValue: 'Price List' }),
    cell: ({ row }) => {
      const name =
        row.original.name ||
        row.original.products?.name ||
        t('priceList.generalPriceList', { defaultValue: 'General Price List' })
      const code = row.original.code
      const isDefault = row.original.is_default
      const items = row.original.price_list_items || []
      const distinctProductCount = new Set(items.map((i) => i.product_id).filter(Boolean)).size

      return (
        <div className='flex flex-col gap-0.5'>
          <div className='flex items-center gap-2'>
            <span className='font-semibold text-foreground'>{name}</span>
            {isDefault && (
              <Badge
                variant='default'
                className='bg-emerald-600 px-1.5 py-0 text-[10px] text-white hover:bg-emerald-700'
              >
                {t('common.default', { defaultValue: 'Default' })}
              </Badge>
            )}
          </div>
          <div className='flex items-center gap-2 text-xs text-muted-foreground'>
            {code && (
              <span className='font-mono font-medium uppercase'>{code}</span>
            )}
            {distinctProductCount > 0 ? (
              <span>
                • {distinctProductCount} {t('priceList.columns.productsCount', { defaultValue: 'Products' })}
              </span>
            ) : row.original.products ? (
              <span>
                • {t('priceList.columns.product', { defaultValue: 'Product' })}:{' '}
                {row.original.products.name}
              </span>
            ) : null}
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: 'type',
    header: t('priceList.columns.type', { defaultValue: 'Pricing Type' }),
    cell: ({ row }) => {
      const type = row.getValue('type') as PriceListType | null
      if (!type) {
        return (
          <span className='text-xs text-muted-foreground'>
            {t('priceList.types.standard', { defaultValue: 'Standard' })}
          </span>
        )
      }
      const config = PRICE_LIST_TYPE_LABELS[type]
      const label = isAr ? config?.labelAr : config?.label
      return (
        <Badge
          variant='outline'
          className={`text-xs font-medium capitalize ${config?.color || ''}`}
        >
          {label || type}
        </Badge>
      )
    },
  },
  {
    id: 'scope',
    header: t('priceList.columns.scope', { defaultValue: 'Scope' }),
    cell: ({ row }) => {
      const group = row.original.customer_groups
      const store = row.original.stores

      return (
        <div className='flex flex-col items-start gap-1'>
          {group ? (
            <Badge
              variant='secondary'
              className='gap-1 px-1.5 py-0 text-[11px]'
            >
              <Users className='h-3 w-3 text-muted-foreground' />
              {group.name}
            </Badge>
          ) : (
            <span className='text-[11px] text-muted-foreground'>
              {t('priceList.scope.allGroups', { defaultValue: 'All Groups' })}
            </span>
          )}

          {store ? (
            <Badge variant='outline' className='gap-1 px-1.5 py-0 text-[11px]'>
              <StoreIcon className='h-3 w-3 text-muted-foreground' />
              {store.name ||
                t('priceList.scope.store', { defaultValue: 'Store' })}
            </Badge>
          ) : (
            <span className='text-[11px] text-muted-foreground'>
              {t('priceList.scope.allStores', { defaultValue: 'All Stores' })}
            </span>
          )}
        </div>
      )
    },
  },
  {
    id: 'currency',
    header: t('priceList.columns.currency', { defaultValue: 'Currency' }),
    cell: ({ row }) => {
      const currency = row.original.currencies
      if (!currency) {
        return (
          <span className='text-[11px] text-muted-foreground'>
            {t('common.default', { defaultValue: 'Default' })}
          </span>
        )
      }
      return (
        <Badge variant='outline' className='gap-1 px-1.5 py-0 text-[11px]'>
          <Coins className='h-3 w-3 text-muted-foreground' />
          {currency.symbol} {currency.code}
        </Badge>
      )
    },
  },
  {
    id: 'channel',
    header: t('priceList.columns.channel', { defaultValue: 'Channel' }),
    cell: ({ row }) => {
      const channel = row.original.channels
      if (!channel) {
        return (
          <span className='text-[11px] text-muted-foreground'>
            {t('common.all', { defaultValue: 'All' })}
          </span>
        )
      }
      const channelName = isAr ? channel.name_ar || channel.name : channel.name
      return (
        <Badge variant='outline' className='gap-1 px-1.5 py-0 text-[11px]'>
          <Radio className='h-3 w-3 text-muted-foreground' />
          {channelName}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'price',
    header: t('priceList.columns.defaultPrice', {
      defaultValue: 'List Price',
    }),
    cell: ({ row }) => {
      const headerPrice = row.original.price != null ? parseFloat(String(row.original.price)) : null
      const items = row.original.price_list_items || []
      const itemPrices = items.map((i) => parseFloat(String(i.price))).filter((p) => !isNaN(p))

      const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(val)

      if (itemPrices.length > 0) {
        const min = Math.min(...itemPrices)
        const max = Math.max(...itemPrices)
        if (min === max) {
          return <div className='font-bold text-primary font-mono'>{formatCurrency(min)}</div>
        }
        return (
          <div className='font-semibold text-primary font-mono text-xs'>
            {formatCurrency(min)} – {formatCurrency(max)}
          </div>
        )
      }

      if (headerPrice != null && !isNaN(headerPrice)) {
        return <div className='font-bold text-primary font-mono'>{formatCurrency(headerPrice)}</div>
      }

      return <div className='text-xs text-muted-foreground font-mono'>—</div>
    },
  },
  {
    id: 'price_source',
    header: t('priceList.columns.priceSource', { defaultValue: 'Pricing Source' }),
    cell: ({ row }) => {
      const source = (row.original.price_source as PriceSource) || 'MANUAL'
      const config = PRICE_SOURCE_LABELS[source]
      const markup = row.original.markup_percent != null ? Number(row.original.markup_percent) : null

      return (
        <div className='flex flex-col items-start gap-1'>
          <Badge
            variant='outline'
            className={`text-[11px] font-medium px-1.5 py-0 ${config?.color || ''}`}
          >
            {isAr ? config?.labelAr : config?.label}
          </Badge>
          {markup != null && markup > 0 && (
            <span className='font-mono text-[10px] text-blue-600 dark:text-blue-400 font-medium'>
              +{markup.toFixed(1)}% markup
            </span>
          )}
        </div>
      )
    },
  },
  {
    id: 'tax_rate',
    header: t('priceList.columns.taxRate', { defaultValue: 'Tax Rate' }),
    cell: ({ row }) => {
      const taxRate = row.original.tax_rates
      if (!taxRate) {
        return <span className='text-[11px] text-muted-foreground'>—</span>
      }
      return (
        <Badge variant='outline' className='font-mono text-[11px] border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 px-1.5 py-0'>
          {getTaxRatePercentage(taxRate.rate)}% {taxRate.is_inclusive ? '(Inc)' : '(Exc)'}
        </Badge>
      )
    },
  },
  {
    id: 'variants_count',
    header: t('priceList.columns.variantRules', {
      defaultValue: 'Priced Items',
    }),
    cell: ({ row }) => {
      const items = row.original.price_list_items || []
      const distinctProductCount = new Set(items.map((i) => i.product_id).filter(Boolean)).size

      return (
        <div className='flex items-center gap-1.5'>
          <Layers className='h-3.5 w-3.5 text-muted-foreground' />
          {items.length > 0 ? (
            <Badge
              variant='secondary'
              className='font-mono text-xs font-medium'
            >
              {items.length} {t('priceList.columns.itemsCount', { defaultValue: 'items' })}
              {distinctProductCount > 1 && ` (${distinctProductCount} prods)`}
            </Badge>
          ) : (
            <span className='text-xs text-muted-foreground'>
              {t('priceList.columns.defaultOnly', {
                defaultValue: 'Default only',
              })}
            </span>
          )}
        </div>
      )
    },
  },
  {
    id: 'validity',
    header: t('priceList.columns.validity', {
      defaultValue: 'Validity Period',
    }),
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
          <div className='flex items-center gap-1 font-mono text-xs'>
            <Calendar className='h-3 w-3 text-muted-foreground' />
            <span>{start}</span>
            <span className='text-muted-foreground'>→</span>
            <span>
              {end || t('priceList.status.open', { defaultValue: 'Open' })}
            </span>
          </div>
          <div>
            {validityStatus === 'active' ? (
              <span className='inline-flex items-center text-[10px] font-medium text-emerald-600 dark:text-emerald-400'>
                ●{' '}
                {t('priceList.status.effectiveNow', {
                  defaultValue: 'In Effect',
                })}
              </span>
            ) : validityStatus === 'upcoming' ? (
              <span className='inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400'>
                <Clock className='h-2.5 w-2.5' />{' '}
                {t('priceList.status.upcoming', { defaultValue: 'Upcoming' })}
              </span>
            ) : (
              <span className='inline-flex items-center text-[10px] font-medium text-zinc-400'>
                {t('priceList.status.expired', { defaultValue: 'Expired' })}
              </span>
            )}
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: 'is_active',
    header: t('priceList.columns.status', { defaultValue: 'Status' }),
    cell: ({ row }) => {
      const isActive = row.getValue('is_active') as boolean
      return (
        <Badge variant={isActive ? 'default' : 'secondary'}>
          {isActive
            ? t('common.active', { defaultValue: 'Active' })
            : t('common.inactive', { defaultValue: 'Inactive' })}
        </Badge>
      )
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => <PriceListRowActions row={row} />,
  },
]

export const columns: ColumnDef<PriceList>[] = getColumns()
