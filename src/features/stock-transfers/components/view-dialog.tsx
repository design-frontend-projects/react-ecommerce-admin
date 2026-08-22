import { StatusBadge } from '@/components/shared/status-badge'
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
import { Button } from '@/components/ui/button'
import type { TransferListItem } from '../data/schema'
import { useTransfer } from '../hooks/use-stock-transfers'
import { TransferTimeline } from './transfer-timeline'
import { TransferWorkflowActions } from './transfer-workflow-actions'

export function TransferViewDialog({
  transfer,
  open,
  onOpenChange,
}: {
  transfer: TransferListItem
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data: detail, isLoading } = useTransfer(
    open ? transfer.id : undefined
  )

  const totalQuantity = detail?.stock_transfer_items.reduce(
    (acc, it) => acc + Number(it.qty || 0),
    0
  ) || 0

  const totalCost = detail?.stock_transfer_items.reduce(
    (acc, it) => acc + Number(it.qty || 0) * Number(it.unit_cost || 0),
    0
  ) || 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-2xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <div className='flex items-center justify-between gap-3 pr-6'>
            <DialogTitle className='text-lg font-bold flex items-center gap-2'>
              Transfer: {transfer.reference_no || transfer.id.slice(0, 8)}
            </DialogTitle>
            <StatusBadge status={transfer.status} />
          </div>
          <DialogDescription className='text-xs pt-1'>
            From{' '}
            <span className='font-semibold text-foreground'>
              {transfer.from_store?.name ?? '—'}
            </span>{' '}
            → To{' '}
            <span className='font-semibold text-foreground'>
              {transfer.to_store?.name ?? '—'}
            </span>
          </DialogDescription>
        </DialogHeader>

        {/* Visual Workflow Stepper */}
        <div className='my-2 px-2 py-3 rounded-lg border bg-muted/20'>
          <TransferTimeline
            status={transfer.status}
            createdAt={transfer.created_at}
          />
        </div>

        {/* Items Table */}
        <div className='space-y-2'>
          <div className='flex items-center justify-between text-xs font-semibold text-muted-foreground'>
            <span>Transfer Items ({detail?.stock_transfer_items.length || 0})</span>
            <span>Total Units: {totalQuantity}</span>
          </div>

          {isLoading ? (
            <p className='text-sm text-muted-foreground py-6 text-center'>
              Loading items...
            </p>
          ) : (
            <div className='overflow-hidden rounded-md border'>
              <Table>
                <TableHeader>
                  <TableRow className='bg-muted/40'>
                    <TableHead className='text-xs'>Product / Variant</TableHead>
                    <TableHead className='text-xs text-end'>Qty</TableHead>
                    <TableHead className='text-xs text-end'>Unit Cost</TableHead>
                    <TableHead className='text-xs text-end'>Line Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail?.stock_transfer_items.map((item) => {
                    const lineTotal =
                      Number(item.qty || 0) * Number(item.unit_cost || 0)
                    return (
                      <TableRow key={item.id} className='text-xs'>
                        <TableCell className='font-medium'>
                          {item.product_variants?.sku ?? item.product_variant_id}
                        </TableCell>
                        <TableCell className='text-end font-semibold'>
                          {item.qty}
                        </TableCell>
                        <TableCell className='text-end text-muted-foreground'>
                          ${Number(item.unit_cost || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className='text-end font-medium'>
                          ${lineTotal.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {totalCost > 0 && (
            <div className='flex justify-end p-2 text-xs font-bold text-foreground bg-muted/30 rounded-md'>
              <span>Total Value: ${totalCost.toFixed(2)}</span>
            </div>
          )}
        </div>

        {transfer.notes && (
          <div className='p-3 rounded-md bg-muted/40 text-xs space-y-1'>
            <span className='font-semibold text-foreground'>Notes:</span>
            <p className='text-muted-foreground'>{transfer.notes}</p>
          </div>
        )}

        <DialogFooter className='flex-row items-center justify-between sm:justify-between gap-2 pt-2 border-t'>
          <TransferWorkflowActions
            transferId={transfer.id}
            status={transfer.status}
            referenceNo={transfer.reference_no}
            onSuccess={() => onOpenChange(false)}
          />

          <Button
            variant='outline'
            size='sm'
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
