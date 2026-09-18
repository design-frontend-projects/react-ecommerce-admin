import { type ColumnDef } from '@tanstack/react-table'
import type { TFunction } from 'i18next'
import i18n from '@/config/i18n'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table'
import type { ReceiptListItem, ReceiptStatus } from '../data/schema'
import { ReceiptRowActions } from './row-actions'

const STATUS_VARIANT: Record<
  ReceiptStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  draft: 'outline',
  posted: 'default',
  cancelled: 'destructive',
}

export const getColumns = (t: TFunction = i18n.t): ColumnDef<ReceiptListItem>[] => [
  {
    accessorKey: 'receipt_number',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('goodsReceipts.columns.receiptNumber', { defaultValue: 'Receipt #' })}
      />
    ),
    cell: ({ row }) => (
      <span className='font-medium font-mono'>{row.original.receipt_number}</span>
    ),
  },
  {
    id: 'warehouse',
    header: t('goodsReceipts.columns.warehouse', { defaultValue: 'Warehouse / Store' }),
    cell: ({ row }) =>
      row.original.warehouses?.name ??
      row.original.stores?.name ??
      '—',
  },
  {
    id: 'purchase_order',
    header: t('goodsReceipts.columns.poNumber', { defaultValue: 'PO #' }),
    cell: ({ row }) => {
      const poNum = row.original.purchase_orders?.po_number
      if (poNum) return <span className='font-semibold text-primary'>PO #{poNum}</span>
      if (row.original.purchase_order_id) {
        return <span className='font-mono text-xs'>PO-{row.original.purchase_order_id.slice(0, 8)}</span>
      }
      return <span className='text-muted-foreground'>—</span>
    },
  },
  {
    id: 'supplier',
    header: t('goodsReceipts.columns.supplier', { defaultValue: 'Supplier' }),
    cell: ({ row }) => row.original.suppliers?.name ?? '—',
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('goodsReceipts.columns.status', { defaultValue: 'Status' })}
      />
    ),
    cell: ({ row }) => (
      <Badge
        variant={STATUS_VARIANT[row.original.status]}
        className='capitalize'
      >
        {t(`goodsReceipts.status.${row.original.status}`, { defaultValue: row.original.status })}
      </Badge>
    ),
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: 'received_date',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('goodsReceipts.columns.receivedDate', { defaultValue: 'Received' })}
      />
    ),
    cell: ({ row }) =>
      new Date(row.original.received_date).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
  },
  {
    id: 'items',
    header: t('goodsReceipts.columns.items', { defaultValue: 'Items' }),
    cell: ({ row }) => row.original._count?.goods_receipt_items ?? 0,
  },
  {
    id: 'actions',
    cell: ({ row }) => <ReceiptRowActions row={row.original} />,
  },
]

export const columns = getColumns()
