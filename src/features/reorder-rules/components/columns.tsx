import { type ColumnDef } from '@tanstack/react-table'
import type { TFunction } from 'i18next'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table'
import type { RuleListItem } from '../data/schema'
import { RuleRowActions } from './row-actions'

function formatQty(value: number | null): string {
  return value === null ? '—' : String(value)
}

export const getColumns = (
  t: TFunction = ((key: string, def?: string) => def ?? key) as unknown as TFunction
): ColumnDef<RuleListItem>[] => [
  {
    id: 'sku',
    accessorFn: (row) => row.product_variants?.sku ?? '',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('reorderRules.columns.product', 'Product')}
      />
    ),
    cell: ({ row }) => {
      const variant = row.original.product_variants
      if (!variant) return '—'
      return (
        <div className='flex flex-col'>
          <span className='font-mono font-medium text-foreground'>
            {variant.sku}
          </span>
          {variant.products?.name ? (
            <span className='line-clamp-1 text-xs text-muted-foreground'>
              {variant.products.name}
            </span>
          ) : null}
        </div>
      )
    },
    enableSorting: true,
  },
  {
    id: 'store',
    header: t('reorderRules.columns.store', 'Store'),
    cell: ({ row }) => (
      <span className='font-medium'>
        {row.original.stores?.name ?? '—'}
      </span>
    ),
  },
  {
    accessorKey: 'reorder_point',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('reorderRules.columns.reorderPoint', 'Reorder point')}
      />
    ),
    cell: ({ row }) => (
      <span className='font-mono font-semibold text-primary'>
        {row.original.reorder_point}
      </span>
    ),
    enableSorting: true,
  },
  {
    id: 'min_max',
    header: t('reorderRules.columns.minMax', 'Min / Max'),
    cell: ({ row }) => (
      <span className='font-mono text-muted-foreground'>
        {formatQty(row.original.min_qty)} — {formatQty(row.original.max_qty)}
      </span>
    ),
  },
  {
    accessorKey: 'safety_stock',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('reorderRules.columns.safetyStock', 'Safety stock')}
      />
    ),
    cell: ({ row }) => (
      <span className='font-mono'>{row.original.safety_stock}</span>
    ),
    enableSorting: true,
  },
  {
    id: 'qty',
    header: t('reorderRules.columns.qty', 'Qty'),
    cell: ({ row }) => (
      <span className='font-mono'>
        {formatQty(row.original.reorder_qty ?? row.original.eoq)}
      </span>
    ),
  },
  {
    accessorKey: 'lead_time_days',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('reorderRules.columns.leadTime', 'Lead time (days)')}
      />
    ),
    cell: ({ row }) =>
      row.original.lead_time_days !== null ? (
        <span className='font-mono text-xs'>
          {row.original.lead_time_days} {t('reorderRules.common.days', 'days')}
        </span>
      ) : (
        '—'
      ),
    enableSorting: true,
  },
  {
    id: 'supplier',
    header: t('reorderRules.columns.supplier', 'Supplier'),
    cell: ({ row }) => (
      <span className='text-sm text-muted-foreground'>
        {row.original.suppliers?.name ?? '—'}
      </span>
    ),
  },
  {
    accessorKey: 'is_active',
    header: t('reorderRules.columns.status', 'Status'),
    cell: ({ row }) => {
      const active = row.original.is_active
      return (
        <Badge
          variant={active ? 'default' : 'secondary'}
          className={
            active
              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
              : 'border-muted-foreground/20 bg-muted text-muted-foreground'
          }
        >
          {active
            ? t('reorderRules.columns.active', 'Active')
            : t('reorderRules.columns.inactive', 'Inactive')}
        </Badge>
      )
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => <RuleRowActions row={row.original} />,
  },
]

export const columns: ColumnDef<RuleListItem>[] = getColumns()
