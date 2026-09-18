import { format, isPast, parseISO } from 'date-fns'
import { Warehouse as WarehouseIcon, AlertCircle } from 'lucide-react'
import { type ColumnDef } from '@tanstack/react-table'
import { type PurchaseOrder } from '../hooks/use-purchase-orders'
import { PORowActions } from './po-row-actions'
import { POStatusBadge } from './po-status-badge'
import { usePOContext } from './po-provider'
import { Badge } from '@/components/ui/badge'

function POCell({ po }: { po: PurchaseOrder }) {
  const { setOpen, setCurrentRow } = usePOContext()
  const poNum = po.po_number ?? po.po_id
  const label = `PO-${String(poNum).padStart(4, '0')}`

  return (
    <button
      type='button'
      onClick={() => {
        setCurrentRow(po)
        setOpen('view')
      }}
      className='font-mono font-semibold text-primary hover:underline cursor-pointer text-left focus:outline-hidden'
    >
      {label}
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
      row.original.suppliers?.name ? (
        <span className='font-medium text-foreground'>
          {row.original.suppliers.name}
        </span>
      ) : (
        <span className='text-muted-foreground'>—</span>
      ),
    filterFn: (row, _id, filterValue: string) => {
      const name = row.original.suppliers?.name?.toLowerCase() || ''
      return name.includes(filterValue.toLowerCase())
    },
  },
  {
    accessorKey: 'warehouses',
    header: t('purchaseOrders.columns.warehouse', 'Destination'),
    cell: ({ row }) => {
      const whName = row.original.warehouses?.name
      if (!whName) {
        return <span className='text-xs text-muted-foreground'>—</span>
      }
      return (
        <div className='flex items-center gap-1.5 text-xs text-muted-foreground font-medium'>
          <WarehouseIcon className='h-3.5 w-3.5 text-primary/70 shrink-0' />
          <span className='truncate max-w-[140px]'>{whName}</span>
        </div>
      )
    },
    filterFn: (row, _id, filterValue: string) => {
      if (!filterValue || filterValue === 'all') return true
      return row.original.warehouse_id === filterValue
    },
  },
  {
    accessorKey: 'order_date',
    header: t('purchaseOrders.columns.orderDate', 'Order Date'),
    cell: ({ row }) => {
      if (!row.original.order_date) {
        return <span className='text-muted-foreground'>—</span>
      }
      try {
        return (
          <span className='text-xs text-muted-foreground'>
            {format(new Date(row.original.order_date), 'MMM dd, yyyy')}
          </span>
        )
      } catch {
        return <span className='text-xs text-muted-foreground'>{row.original.order_date}</span>
      }
    },
    sortingFn: 'datetime',
  },
  {
    accessorKey: 'expected_delivery_date',
    header: t('purchaseOrders.columns.expectedDelivery', 'Expected Delivery'),
    cell: ({ row }) => {
      if (!row.original.expected_delivery_date) {
        return <span className='text-muted-foreground text-xs'>—</span>
      }
      try {
        const dateObj = typeof row.original.expected_delivery_date === 'string'
          ? parseISO(row.original.expected_delivery_date)
          : new Date(row.original.expected_delivery_date)
        
        const isOverdue =
          isPast(dateObj) &&
          !['received', 'closed', 'cancelled'].includes(
            String(row.original.lifecycle_status ?? row.original.status).toLowerCase()
          )

        return (
          <div className='flex items-center gap-1.5 text-xs'>
            <span className={isOverdue ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-muted-foreground'}>
              {format(dateObj, 'MMM dd, yyyy')}
            </span>
            {isOverdue && (
              <span title={t('purchaseOrders.deliveryOverdue', 'Delivery is overdue')}>
                <AlertCircle className='h-3 w-3 text-amber-500 shrink-0' />
              </span>
            )}
          </div>
        )
      } catch {
        return <span className='text-xs text-muted-foreground'>{row.original.expected_delivery_date}</span>
      }
    },
  },
  {
    accessorKey: 'status',
    header: t('purchaseOrders.columns.status', 'Status'),
    cell: ({ row }) => (
      <POStatusBadge
        status={row.original.lifecycle_status ?? row.original.status}
      />
    ),
    filterFn: (row, _id, filterValue: string) => {
      if (!filterValue || filterValue === 'all') return true
      const st = String(row.original.lifecycle_status ?? row.original.status).toLowerCase()
      if (filterValue === 'pending') {
        return ['draft', 'pending', 'approved'].includes(st)
      }
      if (filterValue === 'partial') {
        return ['sent', 'partial', 'partially_received'].includes(st)
      }
      if (filterValue === 'received') {
        return ['received', 'closed'].includes(st)
      }
      return st === filterValue
    },
  },
  {
    accessorKey: 'currency',
    header: t('purchaseOrders.columns.currency', 'Currency'),
    cell: ({ row }) => {
      const code = row.original.currency || row.original.currencies?.code || 'USD'
      const symbol = row.original.currencies?.symbol || '$'
      return (
        <Badge variant='outline' className='font-mono font-semibold text-[11px] bg-muted/30 px-2 py-0.5'>
          {symbol} {code}
        </Badge>
      )
    },
    filterFn: (row, _id, filterValue: string) => {
      if (!filterValue || filterValue === 'all') return true
      const code = (row.original.currency || row.original.currencies?.code || '').toLowerCase()
      const id = row.original.currency_id || row.original.currencies?.id || ''
      return code === filterValue.toLowerCase() || id === filterValue
    },
  },
  {
    accessorKey: 'total_amount',
    header: () => (
      <div className='text-right'>{t('purchaseOrders.columns.total', 'Total')}</div>
    ),
    cell: ({ row }) => {
      const amount = Number(row.original.grand_total ?? row.original.total_amount ?? 0)
      const currency = row.original.currency || row.original.currencies?.code || 'USD'
      const symbol = row.original.currencies?.symbol || '$'
      return (
        <div className='text-right font-semibold font-mono text-xs sm:text-sm text-foreground'>
          {symbol}
          {amount.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}{' '}
          <span className='text-[10px] text-muted-foreground font-normal'>
            {currency}
          </span>
        </div>
      )
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => <PORowActions row={row.original} />,
    size: 50,
  },
]
