import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { type PurchaseOrder } from '../hooks/use-purchase-orders'
import { PORowActions } from './purchase-order-row-actions'

export const columns: ColumnDef<PurchaseOrder>[] = [
  {
    accessorKey: 'po_id',
    header: 'PO ID',
    cell: ({ row }) => (
      <div className='w-[80px]'>PO-{row.getValue('po_id')}</div>
    ),
    enableSorting: true,
    enableHiding: false,
  },
  {
    accessorKey: 'suppliers.name',
    header: 'Supplier',
    cell: ({ row }) => <div>{row.original.suppliers?.name}</div>,
  },
  {
    accessorKey: 'order_date',
    header: 'Order Date',
    cell: ({ row }) => (
      <div>{new Date(row.getValue('order_date')).toLocaleDateString()}</div>
    ),
  },
  {
    accessorKey: 'total_amount',
    header: 'Total Amount',
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('total_amount'))
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(amount)
      return <div className='font-medium'>{formatted}</div>
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as string
      return (
        <Badge variant={status === 'Completed' ? 'default' : 'secondary'}>
          {status}
        </Badge>
      )
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => <PORowActions row={row} />,
  },
]
