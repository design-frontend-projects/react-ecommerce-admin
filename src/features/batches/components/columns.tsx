import { type ColumnDef } from '@tanstack/react-table'
import type { TFunction } from 'i18next'
import { AlertTriangle, Clock, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table'
import type { BatchListItem, BatchStatus } from '../data/schema'
import { BatchRowActions } from './row-actions'

const STATUS_VARIANT: Record<
  BatchStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  active: 'default',
  depleted: 'outline',
  expired: 'destructive',
  blocked: 'secondary',
}

interface ColumnOptions {
  t: TFunction
  formatCurrency: (amount: number | string | null | undefined) => string
  formatDate: (date: Date | string | null | undefined) => string
  onViewDetails?: (row: BatchListItem) => void
  onEdit?: (row: BatchListItem) => void
}

function ExpiryCell({
  row,
  t,
  formatDate,
}: {
  row: BatchListItem
  t: TFunction
  formatDate: (date: Date | string | null | undefined) => string
}) {
  const expiryDate = row.expiry_date
  if (!expiryDate) {
    return (
      <span className='text-xs text-muted-foreground'>
        {t('batches.columns.noExpiry', 'No Expiry')}
      </span>
    )
  }

  const days = row.days_until_expiry
  const isExpired = row.status === 'expired' || (days !== null && days !== undefined && days <= 0)
  const isCritical = row.expiry_urgency === 'critical'
  const isWarning = row.expiry_urgency === 'warning'

  return (
    <div className='flex flex-col gap-1'>
      <span className='text-xs font-medium'>{formatDate(expiryDate)}</span>
      {isExpired ? (
        <Badge variant='destructive' className='w-fit text-[10px] py-0 px-1.5 gap-1'>
          <AlertTriangle className='h-2.5 w-2.5' />
          {t('batches.columns.expired', 'Expired')}
        </Badge>
      ) : isCritical ? (
        <Badge
          variant='destructive'
          className='w-fit text-[10px] py-0 px-1.5 gap-1 bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
        >
          <Clock className='h-2.5 w-2.5' />
          {t('batches.columns.daysLeft', {
            days,
            defaultValue: `${days}d left`,
          })}
        </Badge>
      ) : isWarning ? (
        <Badge
          variant='secondary'
          className='w-fit text-[10px] py-0 px-1.5 gap-1 bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
        >
          <Clock className='h-2.5 w-2.5' />
          {t('batches.columns.daysLeft', {
            days,
            defaultValue: `${days}d left`,
          })}
        </Badge>
      ) : (
        <Badge
          variant='outline'
          className='w-fit text-[10px] py-0 px-1.5 gap-1 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
        >
          <ShieldCheck className='h-2.5 w-2.5' />
          {t('batches.columns.healthy', 'Healthy')}
        </Badge>
      )}
    </div>
  )
}

export function createBatchColumns({
  t,
  formatCurrency,
  formatDate,
  onViewDetails,
  onEdit,
}: ColumnOptions): ColumnDef<BatchListItem>[] {
  return [
    {
      accessorKey: 'batch_number',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t('batches.columns.batchNumber', 'Batch / Lot #')}
        />
      ),
      cell: ({ row }) => (
        <div className='flex flex-col'>
          <button
            type='button'
            onClick={() => onViewDetails?.(row.original)}
            className='text-start font-semibold text-primary hover:underline cursor-pointer'
          >
            {row.original.batch_number}
          </button>
          {row.original.received_reference_type ? (
            <span className='text-[11px] text-muted-foreground capitalize'>
              {row.original.received_reference_type}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      id: 'product',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t('batches.columns.product', 'Product Variant')}
        />
      ),
      cell: ({ row }) => {
        const variant = row.original.product_variants
        if (!variant) return <span className='text-muted-foreground'>—</span>
        return (
          <div className='flex flex-col max-w-[220px]'>
            <span className='font-medium text-xs truncate'>
              {variant.products?.name || variant.name || variant.sku}
            </span>
            <span className='font-mono text-[11px] text-muted-foreground'>
              SKU: {variant.sku}
            </span>
          </div>
        )
      },
    },
    {
      id: 'supplier',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t('batches.columns.supplier', 'Supplier')}
        />
      ),
      cell: ({ row }) => {
        const supplier = row.original.suppliers
        if (!supplier) {
          return <span className='text-muted-foreground text-xs'>—</span>
        }
        return (
          <div className='flex flex-col text-xs'>
            <span className='font-medium'>{supplier.name}</span>
            {supplier.code ? (
              <span className='font-mono text-[11px] text-muted-foreground'>
                {supplier.code}
              </span>
            ) : null}
          </div>
        )
      },
    },
    {
      accessorKey: 'manufacture_date',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t('batches.columns.mfgDate', 'Manufactured')}
        />
      ),
      cell: ({ row }) => (
        <span className='text-xs'>
          {row.original.manufacture_date
            ? formatDate(row.original.manufacture_date)
            : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'expiry_date',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t('batches.columns.expiryDate', 'Expiry Date')}
        />
      ),
      cell: ({ row }) => (
        <ExpiryCell row={row.original} t={t} formatDate={formatDate} />
      ),
    },
    {
      accessorKey: 'qty_on_hand',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t('batches.columns.quantity', 'On Hand')}
        />
      ),
      cell: ({ row }) => (
        <div className='flex flex-col text-xs'>
          <span className='font-bold text-foreground'>
            {row.original.qty_on_hand.toLocaleString()}
          </span>
          {row.original.qty_reserved > 0 ? (
            <span className='text-[10px] text-amber-600 dark:text-amber-400'>
              {row.original.qty_reserved.toLocaleString()}{' '}
              {t('batches.table.reserved', 'Reserved')}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      accessorKey: 'unit_cost',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t('batches.columns.unitCost', 'Unit Cost')}
        />
      ),
      cell: ({ row }) => (
        <span className='text-xs font-medium'>
          {formatCurrency(row.original.unit_cost)}
        </span>
      ),
    },
    {
      accessorKey: 'total_value',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t('batches.columns.totalValue', 'Total Value')}
        />
      ),
      cell: ({ row }) => (
        <span className='text-xs font-semibold text-emerald-600 dark:text-emerald-400'>
          {formatCurrency(row.original.total_value)}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t('batches.columns.status', 'Status')}
        />
      ),
      cell: ({ row }) => (
        <Badge
          variant={STATUS_VARIANT[row.original.status]}
          className='capitalize text-[11px]'
        >
          {t(`batches.status.${row.original.status}`, row.original.status)}
        </Badge>
      ),
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <BatchRowActions
          row={row.original}
          onViewDetails={onViewDetails}
          onEdit={onEdit}
        />
      ),
    },
  ]
}
