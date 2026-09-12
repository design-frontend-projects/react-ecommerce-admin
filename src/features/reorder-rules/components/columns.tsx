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
    id: 'product',
    header: t('reorderRules.columns.product', 'Product'),
    cell: ({ row }) => {
      const variant = row.original.product_variants
      if (!variant) return '—'
      return (
        <span className='font-medium'>
          {variant.products?.name
            ? `${variant.sku} — ${variant.products.name}`
            : variant.sku}
        </span>
      )
    },
  },
  {
    id: 'store',
    header: t('reorderRules.columns.store', 'Store'),
    cell: ({ row }) => row.original.stores?.name ?? '—',
  },
  {
    accessorKey: 'reorder_point',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('reorderRules.columns.reorderPoint', 'Reorder point')}
      />
    ),
    cell: ({ row }) => row.original.reorder_point,
  },
  {
    id: 'min_max',
    header: t('reorderRules.columns.minMax', 'Min / Max'),
    cell: ({ row }) =>
      `${formatQty(row.original.min_qty)} — ${formatQty(row.original.max_qty)}`,
  },
  {
    accessorKey: 'safety_stock',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('reorderRules.columns.safetyStock', 'Safety stock')}
      />
    ),
    cell: ({ row }) => row.original.safety_stock,
  },
  {
    id: 'qty',
    header: t('reorderRules.columns.qty', 'Qty'),
    cell: ({ row }) => formatQty(row.original.reorder_qty ?? row.original.eoq),
  },
  {
    accessorKey: 'lead_time_days',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('reorderRules.columns.leadTime', 'Lead time (days)')}
      />
    ),
    cell: ({ row }) => row.original.lead_time_days ?? '—',
  },
  {
    id: 'supplier',
    header: t('reorderRules.columns.supplier', 'Supplier'),
    cell: ({ row }) => row.original.suppliers?.name ?? '—',
  },
  {
    accessorKey: 'is_active',
    header: t('reorderRules.columns.status', 'Status'),
    cell: ({ row }) => (
      <Badge variant={row.original.is_active ? 'default' : 'outline'}>
        {row.original.is_active
          ? t('reorderRules.columns.active', 'Active')
          : t('reorderRules.columns.inactive', 'Inactive')}
      </Badge>
    ),
  },
  {
    id: 'actions',
    cell: ({ row }) => <RuleRowActions row={row.original} />,
  },
]

export const columns: ColumnDef<RuleListItem>[] = getColumns()
