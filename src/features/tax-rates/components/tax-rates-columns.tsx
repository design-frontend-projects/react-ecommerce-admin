import { type ColumnDef } from '@tanstack/react-table'
import type { TFunction } from 'i18next'
import i18n from '@/config/i18n'
import {
  Globe2,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table/column-header'
import type { TaxRate } from '../types'
import { getTaxRateValidity } from '../utils/tax-math'
import { TaxRowActions } from './tax-rate-row-actions'

export const getTaxRateColumns = (
  t: TFunction = i18n.t
): ColumnDef<TaxRate>[] => [
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
    accessorKey: 'tax_type',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('taxRates.columns.taxType', { defaultValue: 'Tax Type' })}
      />
    ),
    cell: ({ row }) => {
      const description = row.original.description
      return (
        <div className='flex flex-col gap-0.5 max-w-[240px]'>
          <span className='font-semibold text-foreground truncate'>
            {row.getValue('tax_type')}
          </span>
          {description ? (
            <span
              className='text-xs text-muted-foreground truncate'
              title={description}
            >
              {description}
            </span>
          ) : (
            <span className='text-xs text-muted-foreground/60 italic'>
              {t('taxRates.columns.noDescription', {
                defaultValue: 'No description',
              })}
            </span>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: 'rate',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('taxRates.columns.rate', { defaultValue: 'Rate (%)' })}
      />
    ),
    cell: ({ row }) => {
      const rate = Number(row.getValue('rate'))
      return (
        <div className='flex items-center gap-1.5'>
          <span className='font-mono font-bold text-sm text-foreground'>
            {rate.toLocaleString(undefined, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            })}
            %
          </span>
        </div>
      )
    },
  },
  {
    id: 'country',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('taxRates.columns.jurisdiction', {
          defaultValue: 'Jurisdiction',
        })}
      />
    ),
    accessorFn: (row) => row.countries?.name || 'Global',
    cell: ({ row }) => {
      const country = row.original.countries
      if (!country) {
        return (
          <span className='text-xs text-muted-foreground italic flex items-center gap-1'>
            <Globe2 className='h-3.5 w-3.5' />
            {t('taxRates.columns.globalAny', {
              defaultValue: 'Global / Any',
            })}
          </span>
        )
      }
      return (
        <div className='flex items-center gap-1.5'>
          <Badge
            variant='outline'
            className='text-xs font-medium px-2 py-0.5 gap-1'
          >
            <Globe2 className='h-3 w-3 text-muted-foreground' />
            <span>{country.name}</span>
            <span className='text-muted-foreground font-mono'>
              ({country.code})
            </span>
          </Badge>
        </div>
      )
    },
  },
  {
    accessorKey: 'is_inclusive',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('taxRates.columns.type', { defaultValue: 'Type' })}
      />
    ),
    cell: ({ row }) => {
      const isInclusive = Boolean(row.getValue('is_inclusive'))
      return (
        <Badge
          variant={isInclusive ? 'default' : 'secondary'}
          className={
            isInclusive
              ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30'
              : 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30'
          }
        >
          {isInclusive
            ? t('taxRates.columns.inclusive', { defaultValue: 'Inclusive' })
            : t('taxRates.columns.exclusive', { defaultValue: 'Exclusive' })}
        </Badge>
      )
    },
  },
  {
    id: 'validity',
    header: t('taxRates.columns.validityPeriod', {
      defaultValue: 'Validity Period',
    }),
    cell: ({ row }) => {
      const { effective_from, effective_to } = row.original
      const status = getTaxRateValidity(effective_from, effective_to)

      return (
        <div className='flex flex-col gap-1 text-xs'>
          <div className='flex items-center gap-1 text-muted-foreground'>
            <Calendar className='h-3.5 w-3.5' />
            <span>{effective_from}</span>
            {effective_to && <span>→ {effective_to}</span>}
          </div>

          <div>
            {status === 'current' && (
              <span className='inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400'>
                <CheckCircle2 className='h-3 w-3' />
                {t('taxRates.columns.effective', {
                  defaultValue: 'Effective',
                })}
              </span>
            )}
            {status === 'upcoming' && (
              <span className='inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400'>
                <Clock className='h-3 w-3' />
                {t('taxRates.columns.upcoming', { defaultValue: 'Upcoming' })}
              </span>
            )}
            {status === 'expired' && (
              <span className='inline-flex items-center gap-1 text-[11px] font-medium text-rose-600 dark:text-rose-400'>
                <AlertCircle className='h-3 w-3' />
                {t('taxRates.columns.expired', { defaultValue: 'Expired' })}
              </span>
            )}
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: 'is_active',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('taxRates.columns.status', { defaultValue: 'Status' })}
      />
    ),
    cell: ({ row }) => {
      const isActive = Boolean(row.getValue('is_active'))
      return (
        <div className='flex items-center gap-2'>
          <span
            className={`h-2 w-2 rounded-full ${
              isActive ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'
            }`}
          />
          <span className='text-xs font-medium'>
            {isActive
              ? t('taxRates.columns.active', { defaultValue: 'Active' })
              : t('taxRates.columns.inactive', { defaultValue: 'Inactive' })}
          </span>
        </div>
      )
    },
  },
  {
    id: 'actions',
    header: () => (
      <span className='sr-only'>
        {t('taxRates.columns.actions', { defaultValue: 'Actions' })}
      </span>
    ),
    cell: ({ row }) => <TaxRowActions row={row} />,
  },
]

export const columns = getTaxRateColumns()
