import { type ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import { type PurchaseOrder } from '../hooks/use-purchase-orders'
import { POStatusBadge } from './po-status-badge'
import { PORowActions } from './po-row-actions'

export const poColumns: ColumnDef<PurchaseOrder>[] = [
  {
    accessorKey: 'po_id',
    header: 'PO #',
    cell: ({ row }) => (
      <span className='font-mono font-medium'>
        PO-{String(row.original.po_id).padStart(4, '0')}
      </span>
    ),
    size: 100,
  },
  {
    accessorKey: 'suppliers',
    header: 'Supplier',
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
    header: 'Order Date',
    cell: ({ row }) => {
      try {
        return format(new Date(row.original.order_date), 'MMM dd, yyyy')
      } catch {
        return row.original.order_date
      }
    },
    sortingFn: 'datetime',
  },
  {
    accessorKey: 'expected_delivery_date',
    header: 'Expected Delivery',
    cell: ({ row }) => {
      if (!row.original.expected_delivery_date) {
        return <span className='text-muted-foreground'>—</span>
      }
      try {
        return format(
          new Date(row.original.expected_delivery_date),
          'MMM dd, yyyy'
        )
      } catch {
        return row.original.expected_delivery_date
      }
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <POStatusBadge status={row.original.status} />,
    filterFn: (row, _id, filterValue: string[]) => {
      if (!filterValue || filterValue.length === 0) return true
      return filterValue.includes(row.original.status)
    },
  },
  {
    accessorKey: 'total_amount',
    header: () => <div className='text-right'>Total</div>,
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
