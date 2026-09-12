import { format } from 'date-fns'
import { type ColumnDef } from '@tanstack/react-table'
import type { TFunction } from 'i18next'
import { Store, FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table'
import type { RequisitionListItem } from '../data/schema'
import { PRStatusBadge } from './pr-status-badge'
import { RequisitionRowActions } from './row-actions'
import { useRequisitionsContext } from './provider'

function PRCell({ req }: { req: RequisitionListItem }) {
  const { setOpen, setCurrentRow } = useRequisitionsContext()
  return (
    <button
      type='button'
      onClick={() => {
        setCurrentRow(req)
        setOpen('view')
      }}
      className='font-mono font-semibold text-primary hover:underline cursor-pointer text-left flex items-center gap-1.5'
    >
      <FileText className='h-3.5 w-3.5 shrink-0 opacity-70' />
      <span>{req.requisition_number}</span>
    </button>
  )
}

export const getColumns = (t?: TFunction): ColumnDef<RequisitionListItem>[] => [
  {
    accessorKey: 'requisition_number',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t ? t('purchaseRequisitions.columns.reqNumber', 'Requisition #') : 'Requisition #'}
      />
    ),
    cell: ({ row }) => <PRCell req={row.original} />,
  },
  {
    id: 'store',
    header: t ? t('purchaseRequisitions.columns.destination', 'Destination') : 'Destination',
    cell: ({ row }) => {
      const storeName = row.original.stores?.name
      if (!storeName) {
        return <span className='text-muted-foreground text-xs'>—</span>
      }
      return (
        <div className='flex items-center gap-1.5 text-xs'>
          <Store className='h-3.5 w-3.5 shrink-0 text-muted-foreground' />
          <span className='font-medium truncate max-w-[160px]'>{storeName}</span>
        </div>
      )
    },
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t ? t('purchaseRequisitions.columns.status', 'Status') : 'Status'}
      />
    ),
    cell: ({ row }) => <PRStatusBadge status={row.original.status} />,
    filterFn: (row, id, value) => {
      if (!value || value.length === 0) return true
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: 'source',
    header: t ? t('purchaseRequisitions.columns.source', 'Source') : 'Source',
    cell: ({ row }) => (
      <Badge
        variant='outline'
        className='text-[11px] font-normal capitalize'
      >
        {row.original.source === 'reorder_engine'
          ? (t ? t('purchaseRequisitions.sources.reorderEngine', 'Reorder Engine') : 'Reorder Engine')
          : (t ? t('purchaseRequisitions.sources.manual', 'Manual') : 'Manual')}
      </Badge>
    ),
  },
  {
    accessorKey: 'total_amount',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t ? t('purchaseRequisitions.columns.totalValue', 'Est. Total') : 'Est. Total'}
        className='text-right justify-end'
      />
    ),
    cell: ({ row }) => {
      const currency = row.original.currency || 'USD'
      const amount = Number(row.original.total_amount || 0)
      return (
        <div className='text-right font-mono font-semibold text-xs'>
          {currency} {amount.toFixed(2)}
        </div>
      )
    },
  },
  {
    id: 'items',
    header: t ? t('purchaseRequisitions.columns.items', 'Items') : 'Items',
    cell: ({ row }) => {
      const count = row.original._count?.purchase_requisition_items ?? 0
      return (
        <Badge variant='secondary' className='text-xs font-mono font-normal'>
          {count} {count === 1 ? (t ? t('common.item', 'item') : 'item') : (t ? t('common.items', 'items') : 'items')}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'needed_by',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t ? t('purchaseRequisitions.columns.neededBy', 'Needed By') : 'Needed By'}
      />
    ),
    cell: ({ row }) => {
      if (!row.original.needed_by) {
        return <span className='text-muted-foreground text-xs'>{t ? t('common.flexible', 'Flexible') : 'Flexible'}</span>
      }
      try {
        return (
          <span className='text-xs'>
            {format(new Date(row.original.needed_by), 'MMM dd, yyyy')}
          </span>
        )
      } catch {
        return <span className='text-xs'>{row.original.needed_by}</span>
      }
    },
  },
  {
    accessorKey: 'created_at',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t ? t('purchaseRequisitions.columns.date', 'Created') : 'Created'}
      />
    ),
    cell: ({ row }) => {
      try {
        return (
          <span className='text-xs text-muted-foreground'>
            {format(new Date(row.original.created_at), 'MMM dd, yyyy')}
          </span>
        )
      } catch {
        return (
          <span className='text-xs text-muted-foreground'>
            {row.original.created_at}
          </span>
        )
      }
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => <RequisitionRowActions row={row.original} />,
    size: 50,
  },
]

export const columns = getColumns()
