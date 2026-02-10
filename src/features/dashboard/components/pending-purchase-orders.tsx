import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface PendingPurchaseOrdersProps {
  data: any[]
}

export function PendingPurchaseOrders({ data }: PendingPurchaseOrdersProps) {
  if (!data?.length) {
    return (
      <div className='text-sm text-muted-foreground'>
        No pending purchase orders.
      </div>
    )
  }

  return (
    <div className='rounded-md border'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>PO Number</TableHead>
            <TableHead>Supplier</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className='text-right'>Amount</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((po) => (
            <TableRow key={po.po_id}>
              <TableCell className='font-medium'>{po.po_number}</TableCell>
              <TableCell>{po.suppliers?.name}</TableCell>
              <TableCell>
                {format(new Date(po.order_date), 'MMM dd, yyyy')}
              </TableCell>
              <TableCell className='text-right'>
                ${Number(po.total_amount).toFixed(2)}
              </TableCell>
              <TableCell>
                <Badge variant='outline'>{po.status}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
