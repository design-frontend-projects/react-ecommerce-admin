import { type ColumnDef } from '@tanstack/react-table'
import type { TFunction } from 'i18next'
import i18n from '@/i18n'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table'
import type { CountListItem, CountStatus } from '../data/schema'
import { CountRowActions } from './row-actions'

const STATUS_VARIANT: Record<
  CountStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  draft: 'outline',
  counting: 'secondary',
  review: 'secondary',
  posted: 'default',
  cancelled: 'destructive',
}

export const getColumns = (t: TFunction = i18n.t): ColumnDef<CountListItem>[] => [
  {
    accessorKey: 'count_number',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('stockCounts.columns.countNumber', 'Count #')} />
    ),
    cell: ({ row }) => (
      <span className='font-medium'>{row.original.count_number}</span>
    ),
  },
  {
    id: 'warehouse',
    header: t('stockCounts.columns.warehouse', 'Warehouse / Store'),
    cell: ({ row }) =>
      row.original.warehouses?.name ??
      row.original.stores?.name ??
      '—',
  },
  {
    id: 'scope',
    header: t('stockCounts.columns.scope', 'Scope'),
    cell: ({ row }) =>
      row.original.warehouse_location_id
        ? t('stockCounts.scopeSpecificLocation', 'Specific Location')
        : t('stockCounts.scopeWarehouseWide', 'Warehouse-wide'),
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('stockCounts.columns.status', 'Status')} />
    ),
    cell: ({ row }) => (
      <div className='flex items-center gap-1'>
        <Badge
          variant={STATUS_VARIANT[row.original.status] ?? 'outline'}
          className='capitalize'
        >
          {t(`stockCounts.status.${row.original.status}`, row.original.status)}
        </Badge>
        {row.original.is_blind ? (
          <Badge variant='outline'>{t('stockCounts.blind', 'Blind')}</Badge>
        ) : null}
      </div>
    ),
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: 'snapshot_at',
    header: t('stockCounts.columns.snapshot', 'Snapshot'),
    cell: ({ row }) =>
      row.original.snapshot_at
        ? new Date(row.original.snapshot_at).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })
        : '—',
  },
  {
    id: 'items',
    header: t('stockCounts.columns.items', 'Items'),
    cell: ({ row }) => row.original._count?.stock_count_items ?? 0,
  },
  {
    accessorKey: 'created_at',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('stockCounts.columns.created', 'Created')} />
    ),
    cell: ({ row }) =>
      new Date(row.original.created_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
  },
  {
    id: 'actions',
    cell: ({ row }) => <CountRowActions row={row.original} />,
  },
]

export const columns = getColumns()

