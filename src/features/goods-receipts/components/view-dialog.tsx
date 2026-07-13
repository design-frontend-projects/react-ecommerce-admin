import { useState } from 'react'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Can } from '@/components/rbac/Can'
import {
  useCancelReceipt,
  usePostReceipt,
  useReceipt,
} from '../hooks/use-goods-receipts'
import type { ReceiptListItem } from '../data/schema'

export function ReceiptViewDialog({
  receipt,
  open,
  onOpenChange,
}: {
  receipt: ReceiptListItem
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data: detail, isLoading } = useReceipt(open ? receipt.id : undefined)
  const postReceipt = usePostReceipt()
  const cancelReceipt = useCancelReceipt()
  const [confirmPost, setConfirmPost] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)

  const isDraft = receipt.status === 'draft'

  const handlePost = async () => {
    try {
      await postReceipt.mutateAsync(receipt.id)
      setConfirmPost(false)
      onOpenChange(false)
    } catch {
      setConfirmPost(false)
    }
  }

  const handleCancel = async () => {
    try {
      await cancelReceipt.mutateAsync(receipt.id)
      setConfirmCancel(false)
      onOpenChange(false)
    } catch {
      setConfirmCancel(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className='sm:max-w-3xl'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              {receipt.receipt_number}
              <Badge variant='secondary' className='capitalize'>
                {receipt.status}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              {receipt.stores?.name ?? '—'}
            </DialogDescription>
          </DialogHeader>

          <div className='grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4'>
            <div>
              <p className='text-muted-foreground'>PO #</p>
              <p className='font-medium'>
                {receipt.purchase_order_id !== null
                  ? `PO-${String(receipt.purchase_order_id).padStart(4, '0')}`
                  : '—'}
              </p>
            </div>
            <div>
              <p className='text-muted-foreground'>Supplier</p>
              <p className='font-medium'>{receipt.suppliers?.name ?? '—'}</p>
            </div>
            <div>
              <p className='text-muted-foreground'>Received</p>
              <p className='font-medium'>
                {new Date(receipt.received_date).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </div>
            <div>
              <p className='text-muted-foreground'>Items</p>
              <p className='font-medium'>
                {receipt._count?.goods_receipt_items ??
                  detail?.goods_receipt_items.length ??
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
                    <TableHead className='text-end'>Unit cost</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail?.goods_receipt_items.map((item) => (
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
                        {item.qty_received}
                      </TableCell>
                      <TableCell className='text-end'>
                        {item.unit_cost}
                      </TableCell>
                      <TableCell>{item.batch_number ?? '—'}</TableCell>
                      <TableCell>
                        {item.expiry_date
                          ? new Date(item.expiry_date).toLocaleDateString(
                              undefined,
                              {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              }
                            )
                          : '—'}
                      </TableCell>
                      <TableCell>
                        {item.warehouse_locations?.path ?? '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {receipt.notes ? (
            <p className='text-sm text-muted-foreground'>{receipt.notes}</p>
          ) : null}

          <DialogFooter>
            {isDraft ? (
              <Can permission='purchasing.manage'>
                <Button
                  variant='outline'
                  onClick={() => setConfirmCancel(true)}
                  disabled={cancelReceipt.isPending}
                >
                  Cancel receipt
                </Button>
                <Button
                  onClick={() => setConfirmPost(true)}
                  disabled={postReceipt.isPending}
                >
                  Post receipt
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
        open={confirmPost}
        onOpenChange={setConfirmPost}
        title='Post this receipt?'
        desc='Stock balances will be increased and movements recorded through the movement engine. This cannot be undone.'
        confirmText='Post'
        cancelBtnText='Cancel'
        isLoading={postReceipt.isPending}
        handleConfirm={handlePost}
      />
      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        destructive
        title='Cancel this receipt?'
        desc='The draft goods receipt will be marked cancelled.'
        confirmText='Cancel receipt'
        cancelBtnText='Keep draft'
        isLoading={cancelReceipt.isPending}
        handleConfirm={handleCancel}
      />
    </>
  )
}
