import { format } from 'date-fns'
import { type ColumnDef } from '@tanstack/react-table'
import { type PurchaseOrder } from '../hooks/use-purchase-orders'
import { PORowActions } from './po-row-actions'
import { POStatusBadge } from './po-status-badge'
import { usePOContext } from './po-provider'

function POCell({ po }: { po: PurchaseOrder }) {
  const { setOpen, setCurrentRow } = usePOContext()
  return (
    <button
      type='button'
      onClick={() => {
        setCurrentRow(po)
        setOpen('view')
      }}
      className='font-mono font-medium text-primary hover:underline cursor-pointer text-left'
    >
      PO-{String(po.po_id).padStart(4, '0')}
    </button>
  )
}

export const getPOColumns = (
  t: (key: string, fallback: string) => string = (_k, fallback) => fallback
): ColumnDef<PurchaseOrder>[] => [
  {
    accessorKey: 'po_id',
    header: t('purchaseOrders.columns.poNumber', 'PO #'),
    cell: ({ row }) => <POCell po={row.original} />,
    size: 100,
  },
  {
    accessorKey: 'suppliers',
    header: t('purchaseOrders.columns.supplier', 'Supplier'),
    cell: ({ row }) =>
      row.original.suppliers?.name || (
        <span className='text-muted-foreground'>—</span>
      ),
    filterFn: (row, _id, filterValue: string) => {
      const name = row.original.suppliers?.name?.toLowerCase() || ''
      return name.includes(filterValue.toLowerCase())
    },
  },
  {
    accessorKey: 'order_date',
    header: t('purchaseOrders.columns.orderDate', 'Order Date'),
    cell: ({ row }) => {
      try {
        return format(
          new Date(row.original.order_date as string),
          'MMM dd, yyyy'
        )
      } catch {
        return row.original.order_date
      }
    },
    sortingFn: 'datetime',
  },
  {
    accessorKey: 'expected_delivery_date',
    header: t('purchaseOrders.columns.expectedDelivery', 'Expected Delivery'),
    cell: ({ row }) => {
      if (!row.original.expected_delivery_date) {
        return <span className='text-muted-foreground'>—</span>
      }
      try {
        return format(
          new Date(row.original.expected_delivery_date as string),
          'MMM dd, yyyy'
        )
      } catch {
        return row.original.expected_delivery_date
      }
    },
  },
  {
    accessorKey: 'status',
    header: t('purchaseOrders.columns.status', 'Status'),
    cell: ({ row }) => <POStatusBadge status={row.original.status} />,
    filterFn: (row, _id, filterValue: string[]) => {
      if (!filterValue || filterValue.length === 0) return true
      return filterValue.includes(row.original.status)
    },
  },
  {
    accessorKey: 'total_amount',
    header: () => <div className='text-right'>{t('purchaseOrders.columns.total', 'Total')}</div>,
    cell: ({ row }) => (
      <div className='text-right font-medium'>
        ${Number(row.original.total_amount || 0).toFixed(2)}
      </div>
    ),
  },
  {
    id: 'actions',
    cell: ({ row }) => <PORowActions row={row.original} />,
    size: 50,
  },
]

export const poColumns = getPOColumns()
