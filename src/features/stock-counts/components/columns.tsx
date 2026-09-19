import { type ColumnDef } from '@tanstack/react-table'
import type { TFunction } from 'i18next'
import {
  FolderTree,
  Warehouse,
  MapPin,
  Boxes,
  EyeOff,
} from 'lucide-react'
import i18n from '@/config/i18n'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table'
import type { CountListItem, CountStatus } from '../data/schema'
import { CountRowActions } from './row-actions'

const STATUS_CONFIG: Record<
  CountStatus,
  {
    label: string
    variant: 'default' | 'secondary' | 'destructive' | 'outline'
    className: string
  }
> = {
  draft: {
    label: 'Draft',
    variant: 'outline',
    className: 'border-slate-400/40 text-slate-600 dark:text-slate-400 bg-slate-500/5',
  },
  counting: {
    label: 'In Counting',
    variant: 'secondary',
    className: 'border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10 font-semibold',
  },
  review: {
    label: 'In Review',
    variant: 'secondary',
    className: 'border-teal-500/40 text-teal-600 dark:text-teal-400 bg-teal-500/10 font-semibold',
  },
  posted: {
    label: 'Posted',
    variant: 'default',
    className: 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 font-semibold',
  },
  cancelled: {
    label: 'Cancelled',
    variant: 'destructive',
    className: 'border-rose-500/40 text-rose-600 dark:text-rose-400 bg-rose-500/10',
  },
}

export const getColumns = (t: TFunction = i18n.t): ColumnDef<CountListItem>[] => [
  {
    accessorKey: 'count_number',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('stockCounts.columns.countNumber', 'Count #')}
      />
    ),
    cell: ({ row }) => (
      <div className='flex items-center gap-2'>
        <span className='font-mono font-bold text-foreground text-xs'>
          {row.original.count_number}
        </span>
      </div>
    ),
  },
  {
    id: 'warehouse',
    header: t('stockCounts.columns.warehouse', 'Facility'),
    cell: ({ row }) => {
      const name =
        row.original.warehouses?.name ??
        row.original.stores?.name ??
        '—'
      const code = row.original.warehouses?.code

      return (
        <div className='flex items-center gap-1.5'>
          <Warehouse className='h-3.5 w-3.5 text-muted-foreground shrink-0' />
          <span className='font-medium text-xs text-foreground truncate max-w-[140px]'>
            {name}
          </span>
          {code && (
            <span className='font-mono text-[10px] text-muted-foreground'>
              ({code})
            </span>
          )}
        </div>
      )
    },
  },
  {
    id: 'scope',
    header: t('stockCounts.columns.scope', 'Scope'),
    cell: ({ row }) => {
      const cat = row.original.categories
      const locId = row.original.warehouse_location_id

      if (cat?.name) {
        return (
          <Badge
            variant='outline'
            className='text-[10px] py-0 px-2 flex items-center gap-1 font-medium border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5'
          >
            <FolderTree className='h-3 w-3 shrink-0' />
            <span className='truncate max-w-[120px]'>{cat.name}</span>
          </Badge>
        )
      }

      if (locId) {
        return (
          <Badge
            variant='outline'
            className='text-[10px] py-0 px-2 flex items-center gap-1 font-medium text-muted-foreground'
          >
            <MapPin className='h-3 w-3 shrink-0' />
            <span>{t('stockCounts.scopeSpecificLocation', 'Location')}</span>
          </Badge>
        )
      }

      return (
        <Badge
          variant='secondary'
          className='text-[10px] py-0 px-2 font-normal text-muted-foreground'
        >
          {t('stockCounts.scopeWarehouseWide', 'Facility-wide')}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('stockCounts.columns.status', 'Status')}
      />
    ),
    cell: ({ row }) => {
      const config = STATUS_CONFIG[row.original.status] ?? STATUS_CONFIG.draft

      return (
        <div className='flex items-center gap-1.5'>
          <Badge variant='outline' className={`text-[11px] py-0.5 px-2 ${config.className}`}>
            {t(`stockCounts.status.${row.original.status}`, config.label)}
          </Badge>
          {row.original.is_blind ? (
            <Badge
              variant='outline'
              className='text-[10px] py-0 px-1.5 text-muted-foreground flex items-center gap-1'
              title={t('stockCounts.blindHelp', 'Blind Count: counters cannot see expected quantities')}
            >
              <EyeOff className='h-2.5 w-2.5' />
              {t('stockCounts.blind', 'Blind')}
            </Badge>
          ) : null}
        </div>
      )
    },
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    id: 'items',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('stockCounts.columns.items', 'Items')}
      />
    ),
    cell: ({ row }) => {
      const count = row.original._count?.stock_count_items ?? 0
      return (
        <div className='flex items-center gap-1 text-xs'>
          <Boxes className='h-3.5 w-3.5 text-muted-foreground' />
          <span className='font-semibold tabular-nums'>{count}</span>
          <span className='text-muted-foreground text-[11px]'>lines</span>
        </div>
      )
    },
  },
  {
    accessorKey: 'snapshot_at',
    header: t('stockCounts.columns.snapshot', 'Snapshot'),
    cell: ({ row }) =>
      row.original.snapshot_at ? (
        <span className='text-xs tabular-nums text-muted-foreground'>
          {new Date(row.original.snapshot_at).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </span>
      ) : (
        <span className='text-muted-foreground text-xs'>—</span>
      ),
  },
  {
    accessorKey: 'created_at',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('stockCounts.columns.created', 'Created')}
      />
    ),
    cell: ({ row }) => (
      <span className='text-xs tabular-nums text-muted-foreground'>
        {new Date(row.original.created_at).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })}
      </span>
    ),
  },
  {
    id: 'actions',
    cell: ({ row }) => <CountRowActions row={row.original} />,
  },
]

export const columns = getColumns()
