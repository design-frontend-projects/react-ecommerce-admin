import { useState } from 'react'
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
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Can } from '@/components/rbac/Can'
import type { TransferListItem } from '../data/schema'
import {
  useApplyTransfer,
  useCancelTransfer,
  useTransfer,
} from '../hooks/use-stock-transfers'

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
  const applyTransfer = useApplyTransfer()
  const cancelTransfer = useCancelTransfer()
  const [confirmApply, setConfirmApply] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)

  const isDraft = transfer.status === 'draft'

  const handleApply = async () => {
    try {
      await applyTransfer.mutateAsync(transfer.id)
      setConfirmApply(false)
      onOpenChange(false)
    } catch {
      setConfirmApply(false)
    }
  }

  const handleCancel = async () => {
    try {
      await cancelTransfer.mutateAsync(transfer.id)
      setConfirmCancel(false)
      onOpenChange(false)
    } catch {
      setConfirmCancel(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className='sm:max-w-2xl'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              {transfer.reference_no || transfer.id.slice(0, 8)}
              <Badge variant='secondary' className='capitalize'>
                {transfer.status.replace('_', ' ')}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              {transfer.from_store?.name ?? '—'} →{' '}
              {transfer.to_store?.name ?? '—'}
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <p className='text-sm text-muted-foreground'>Loading items...</p>
          ) : (
            <div className='overflow-hidden rounded-md border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Variant</TableHead>
                    <TableHead className='text-end'>Qty</TableHead>
                    <TableHead className='text-end'>Unit cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail?.stock_transfer_items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {item.product_variants?.sku ?? item.product_variant_id}
                      </TableCell>
                      <TableCell className='text-end'>{item.qty}</TableCell>
                      <TableCell className='text-end'>
                        {item.unit_cost}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {transfer.notes ? (
            <p className='text-sm text-muted-foreground'>{transfer.notes}</p>
          ) : null}

          <DialogFooter>
            {isDraft ? (
              <Can permission='inventory.manage'>
                <Button
                  variant='outline'
                  onClick={() => setConfirmCancel(true)}
                  disabled={cancelTransfer.isPending}
                >
                  Cancel transfer
                </Button>
                <Button
                  onClick={() => setConfirmApply(true)}
                  disabled={applyTransfer.isPending}
                >
                  Apply
                </Button>
              </Can>
            ) : (
              <Button variant='outline' onClick={() => onOpenChange(false)}>
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmApply}
        onOpenChange={setConfirmApply}
        title='Apply this transfer?'
        desc='Stock will move from the source to the destination store. This cannot be undone.'
        confirmText='Apply'
        isLoading={applyTransfer.isPending}
        handleConfirm={handleApply}
      />
      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        destructive
        title='Cancel this transfer?'
        desc='The draft transfer will be marked cancelled.'
        confirmText='Cancel transfer'
        isLoading={cancelTransfer.isPending}
        handleConfirm={handleCancel}
      />
    </>
  )
}
