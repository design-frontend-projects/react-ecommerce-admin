import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { RequisitionListItem } from '../data/schema'
import { useRequisition } from '../hooks/use-purchase-requisitions'

export function RequisitionViewDialog({
  requisition,
  open,
  onOpenChange,
}: {
  requisition: RequisitionListItem
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data: detail, isLoading } = useRequisition(
    open ? requisition.id : undefined
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-3xl'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            {requisition.requisition_number}
            <Badge variant='secondary' className='capitalize'>
              {requisition.status}
            </Badge>
            <Badge variant='outline'>
              {requisition.source === 'reorder_engine'
                ? 'Reorder engine'
                : 'Manual'}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {requisition.stores?.name ?? '—'}
          </DialogDescription>
        </DialogHeader>

        <div className='grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3'>
          <div>
            <p className='text-muted-foreground'>Needed by</p>
            <p className='font-medium'>
              {requisition.needed_by
                ? new Date(requisition.needed_by).toLocaleDateString(
                    undefined,
                    { year: 'numeric', month: 'short', day: 'numeric' }
                  )
                : '—'}
            </p>
          </div>
          <div>
            <p className='text-muted-foreground'>Created</p>
            <p className='font-medium'>
              {new Date(requisition.created_at).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </p>
          </div>
          <div>
            <p className='text-muted-foreground'>Items</p>
            <p className='font-medium'>
              {requisition._count?.purchase_requisition_items ??
                detail?.purchase_requisition_items.length ??
                0}
            </p>
          </div>
        </div>

        {isLoading ? (
          <p className='text-sm text-muted-foreground'>Loading items...</p>
        ) : (
          <div className='overflow-hidden rounded-md border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Variant</TableHead>
                  <TableHead className='text-end'>Qty</TableHead>
                  <TableHead className='text-end'>Est. cost</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail?.purchase_requisition_items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {item.product_variants?.sku ?? '—'}
                      {item.product_variants?.products?.name ? (
                        <span className='text-muted-foreground'>
                          {' '}
                          — {item.product_variants.products.name}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className='text-end'>
                      {item.qty_requested}
                    </TableCell>
                    <TableCell className='text-end'>
                      {item.est_unit_cost}
                    </TableCell>
                    <TableCell>{item.suppliers?.name ?? '—'}</TableCell>
                    <TableCell className='text-muted-foreground'>
                      {item.reason ?? '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {requisition.notes ? (
          <p className='text-sm text-muted-foreground'>{requisition.notes}</p>
        ) : null}

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
