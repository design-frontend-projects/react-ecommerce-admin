import { Link } from '@tanstack/react-router'
import { type ColumnDef } from '@tanstack/react-table'
import i18n from '@/config/i18n'
import type { TFunction } from 'i18next'
import {
  ArrowRight,
  Building2,
  Calendar,
  Layers,
  Store,
  Warehouse,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import type { TransferListItem, TransferPriority } from '../data/schema'
import { TransferRowActions } from './row-actions'

function getEntityDisplay(
  t: TFunction,
  warehouse?: { name: string | null; code?: string | null } | null,
  store?: { name: string | null } | null,
  branch?: { name: string | null } | null
) {
  if (warehouse?.name) {
    return {
      name: warehouse.name,
      code: warehouse.code,
      type: t('stockTransfers.entityTypes.warehouse', 'Warehouse'),
      Icon: Warehouse,
    }
  }
  if (store?.name) {
    return {
      name: store.name,
      code: null,
      type: t('stockTransfers.entityTypes.store', 'Store'),
      Icon: Store,
    }
  }
  if (branch?.name) {
    return {
      name: branch.name,
      code: null,
      type: t('stockTransfers.entityTypes.branch', 'Branch'),
      Icon: Building2,
    }
  }
  return {
    name: '—',
    code: null,
    type: '',
    Icon: Warehouse,
  }
}

const TYPE_CONFIG: Record<
  string,
  { label: string; icon: typeof Warehouse; color: string }
> = {
  internal: {
    label: 'Internal Bin',
    icon: Layers,
    color:
      'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  },
  inter_warehouse: {
    label: 'Warehouse',
    icon: Warehouse,
    color:
      'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  },
  warehouse: {
    label: 'Warehouse',
    icon: Warehouse,
    color:
      'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  },
  inter_store: {
    label: 'Store',
    icon: Store,
    color:
      'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  },
  store: {
    label: 'Store',
    icon: Store,
    color:
      'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  },
  inter_branch: {
    label: 'Branch',
    icon: Building2,
    color:
      'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  },
  branch: {
    label: 'Branch',
    icon: Building2,
    color:
      'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  },
}

const PRIORITY_BADGE: Record<TransferPriority, string> = {
  low: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200',
  normal:
    'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200',
  high: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200',
  urgent:
    'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 font-semibold',
}

export const getColumns = (
  t: TFunction = i18n.t
): ColumnDef<TransferListItem>[] => [
  {
    accessorKey: 'reference_no',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t(
          'stockTransfers.columns.referenceOrTransfer',
          'Reference / Transfer #'
        )}
      />
    ),
    cell: ({ row }) => {
      const ref =
        row.original.reference_no || `TR-${row.original.id.slice(0, 8)}`
      return (
        <div className='flex flex-col'>
          <Link
            to='/stock-transfers/$transferId'
            params={{ transferId: row.original.id }}
            className='font-mono text-xs font-semibold text-foreground transition-colors hover:text-primary hover:underline sm:text-sm'
          >
            {ref}
          </Link>
          {row.original.transfer_no && (
            <span className='font-mono text-[11px] text-muted-foreground'>
              #{row.original.transfer_no}
            </span>
          )}
        </div>
      )
    },
  },
  {
    id: 'route',
    header: t('stockTransfers.columns.route', 'Route (Origin → Destination)'),
    cell: ({ row }) => {
      const from = getEntityDisplay(
        t,
        row.original.source_warehouse,
        row.original.from_store,
        row.original.from_branch
      )
      const to = getEntityDisplay(
        t,
        row.original.destination_warehouse,
        row.original.to_store,
        row.original.to_branch
      )

      return (
        <div className='flex items-center gap-2 text-xs sm:text-sm'>
          <div className='flex items-center gap-1.5 font-medium'>
            {from.type && (
              <Badge
                variant='outline'
                className='h-4 px-1.5 py-0 text-[10px] font-normal text-muted-foreground'
              >
                {from.type}
              </Badge>
            )}
            <span className='max-w-[130px] truncate'>{from.name}</span>
          </div>
          <ArrowRight className='h-3.5 w-3.5 shrink-0 text-muted-foreground rtl:rotate-180' />
          <div className='flex items-center gap-1.5 font-medium'>
            {to.type && (
              <Badge
                variant='outline'
                className='h-4 px-1.5 py-0 text-[10px] font-normal text-muted-foreground'
              >
                {to.type}
              </Badge>
            )}
            <span className='max-w-[130px] truncate'>{to.name}</span>
          </div>
        </div>
      )
    },
  },
  {
    id: 'classification',
    header: t('stockTransfers.columns.classification', 'Type & Priority'),
    cell: ({ row }) => {
      const typeKey = row.original.transfer_type || 'inter_warehouse'
      const typeConfig = TYPE_CONFIG[typeKey] || TYPE_CONFIG.inter_warehouse
      const priority = row.original.priority || 'normal'
      const TypeIcon = typeConfig.icon

      return (
        <div className='flex flex-wrap items-center gap-1.5'>
          <Badge
            variant='outline'
            className={`h-4.5 gap-1 px-1.5 py-0.5 text-[10px] font-medium ${typeConfig.color}`}
          >
            <TypeIcon className='h-3 w-3' />
            <span>{typeConfig.label}</span>
          </Badge>
          <Badge
            variant='outline'
            className={`h-4.5 px-1.5 py-0.5 text-[9px] text-[10px] font-semibold tracking-wide uppercase ${PRIORITY_BADGE[priority]}`}
          >
            {priority}
          </Badge>
          {row.original.reason_code && (
            <span className='py-0.2 rounded bg-muted/30 px-1 font-mono text-[10px] text-muted-foreground'>
              {row.original.reason_code.replace('_', ' ')}
            </span>
          )}
        </div>
      )
    },
  },
  {
    id: 'items',
    header: t('stockTransfers.columns.items', 'Cargo Items'),
    cell: ({ row }) => {
      const count = row.original._count?.stock_transfer_items ?? 0
      return (
        <Badge variant='secondary' className='text-xs font-semibold'>
          {count === 1
            ? t('stockTransfers.columns.item', {
                count,
                defaultValue: '1 item',
              })
            : t('stockTransfers.columns.items_other', {
                count,
                defaultValue: `${count} items`,
              })}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('stockTransfers.columns.status', 'Status')}
      />
    ),
    cell: ({ row }) => <StatusBadge status={row.original.status} size='sm' />,
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: 'created_at',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('stockTransfers.columns.schedule', 'Schedule & Dates')}
      />
    ),
    cell: ({ row }) => {
      const shipDate = row.original.expected_ship_date
      const receiveDate = row.original.expected_receive_date
      const createdAt = row.original.created_at

      if (shipDate || receiveDate) {
        return (
          <div className='flex flex-col font-mono text-[11px] text-muted-foreground'>
            {shipDate && (
              <span>Ship: {new Date(shipDate).toLocaleDateString()}</span>
            )}
            {receiveDate && (
              <span className='text-foreground'>
                Rec: {new Date(receiveDate).toLocaleDateString()}
              </span>
            )}
          </div>
        )
      }

      return (
        <div className='flex items-center gap-1 text-xs text-muted-foreground'>
          <Calendar className='h-3 w-3' />
          <span>
            {new Date(createdAt).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>
      )
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <div className='flex justify-end'>
        <TransferRowActions row={row.original} />
      </div>
    ),
  },
]

export const columns = getColumns()
