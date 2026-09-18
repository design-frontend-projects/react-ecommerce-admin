import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, XCircle, FileText } from 'lucide-react'
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
import type { ReceiptListItem } from '../data/schema'
import {
  useCancelReceipt,
  usePostReceipt,
  useReceipt,
} from '../hooks/use-goods-receipts'

export function ReceiptViewDialog({
  receipt,
  open,
  onOpenChange,
}: {
  receipt: ReceiptListItem
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
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

  const poDisplay = receipt.purchase_orders?.po_number
    ? `PO #${receipt.purchase_orders.po_number}`
    : receipt.purchase_order_id
      ? `PO-${receipt.purchase_order_id.slice(0, 8)}`
      : '—'

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className='sm:max-w-4xl'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <FileText className='h-5 w-5 text-primary' />
              <span>{receipt.receipt_number}</span>
              <Badge
                variant={
                  receipt.status === 'posted'
                    ? 'default'
                    : receipt.status === 'cancelled'
                      ? 'destructive'
                      : 'outline'
                }
                className='capitalize'
              >
                {t(`goodsReceipts.status.${receipt.status}`, { defaultValue: receipt.status })}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              {receipt.warehouses?.name ?? receipt.stores?.name ?? '—'}
            </DialogDescription>
          </DialogHeader>

          <div className='grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4 rounded-lg border bg-muted/20 p-3.5'>
            <div>
              <p className='text-xs text-muted-foreground font-medium'>
                {t('goodsReceipts.columns.poNumber', { defaultValue: 'PO Reference' })}
              </p>
              <p className='font-semibold text-primary mt-0.5'>{poDisplay}</p>
            </div>
            <div>
              <p className='text-xs text-muted-foreground font-medium'>
                {t('goodsReceipts.columns.supplier', { defaultValue: 'Supplier' })}
              </p>
              <p className='font-semibold mt-0.5'>{receipt.suppliers?.name ?? '—'}</p>
            </div>
            <div>
              <p className='text-xs text-muted-foreground font-medium'>
                {t('goodsReceipts.columns.receivedDate', { defaultValue: 'Received Date' })}
              </p>
              <p className='font-semibold mt-0.5'>
                {new Date(receipt.received_date).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </div>
            <div>
              <p className='text-xs text-muted-foreground font-medium'>
                {t('goodsReceipts.items', { defaultValue: 'Total Items' })}
              </p>
              <p className='font-semibold mt-0.5'>
                {receipt._count?.goods_receipt_items ??
                  detail?.goods_receipt_items.length ??
                  0}
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className='py-8 text-center text-sm text-muted-foreground'>
              {t('goodsReceipts.form.saving', { defaultValue: 'Loading details...' })}
            </div>
          ) : (
            <div className='overflow-hidden rounded-md border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('goodsReceipts.columns.product', { defaultValue: 'Product / Variant' })}</TableHead>
                    <TableHead className='text-end'>{t('goodsReceipts.receivingQty', { defaultValue: 'Received' })}</TableHead>
                    <TableHead className='text-end text-emerald-600'>{t('goodsReceipts.acceptedQty', { defaultValue: 'Accepted' })}</TableHead>
                    <TableHead className='text-end text-rose-600'>{t('goodsReceipts.rejectedQty', { defaultValue: 'Rejected' })}</TableHead>
                    <TableHead className='text-end'>{t('goodsReceipts.unitCost', { defaultValue: 'Unit Cost' })}</TableHead>
                    <TableHead>{t('goodsReceipts.batchNumber', { defaultValue: 'Batch' })}</TableHead>
                    <TableHead>{t('goodsReceipts.expiryDate', { defaultValue: 'Expiry' })}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail?.goods_receipt_items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <span className='font-medium'>
                          {item.product_variants?.products?.name ?? item.product_variants?.sku ?? '—'}
                        </span>
                        {item.product_variants?.sku && item.product_variants?.products?.name ? (
                          <div className='text-xs text-muted-foreground font-mono'>
                            {item.product_variants.sku}
                          </div>
                        ) : null}
                        {item.rejection_reason && (
                          <div className='text-[11px] text-rose-500 mt-0.5'>
                            {t('goodsReceipts.rejectionReason', { defaultValue: 'Reason' })}: {item.rejection_reason}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className='text-end font-semibold'>
                        {item.qty_received}
                      </TableCell>
                      <TableCell className='text-end text-emerald-600 font-medium'>
                        {item.accepted_qty ?? item.qty_received}
                      </TableCell>
                      <TableCell className='text-end text-rose-600 font-medium'>
                        {item.rejected_qty ?? 0}
                      </TableCell>
                      <TableCell className='text-end font-mono'>
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {receipt.notes ? (
            <div className='rounded-md bg-muted/40 p-2.5 text-xs text-muted-foreground'>
              <strong>{t('goodsReceipts.form.notes', { defaultValue: 'Notes' })}:</strong> {receipt.notes}
            </div>
          ) : null}

          <DialogFooter>
            {isDraft ? (
              <Can permission='purchasing.manage'>
                <Button
                  variant='outline'
                  onClick={() => setConfirmCancel(true)}
                  disabled={cancelReceipt.isPending}
                  className='text-destructive hover:bg-destructive/10'
                >
                  <XCircle className='h-4 w-4 me-1.5' />
                  {t('goodsReceipts.cancelReceipt', { defaultValue: 'Cancel receipt' })}
                </Button>
                <Button
                  onClick={() => setConfirmPost(true)}
                  disabled={postReceipt.isPending}
                  className='gap-1.5'
                >
                  <CheckCircle2 className='h-4 w-4 me-1.5' />
                  {t('goodsReceipts.postReceipt', { defaultValue: 'Post receipt' })}
                </Button>
              </Can>
            ) : (
              <Button variant='outline' onClick={() => onOpenChange(false)}>
                {t('goodsReceipts.form.cancel', { defaultValue: 'Close' })}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmPost}
        onOpenChange={setConfirmPost}
        title={t('goodsReceipts.dialog.postTitle', { defaultValue: 'Post this receipt?' })}
        desc={t('goodsReceipts.dialog.postDesc', {
          defaultValue:
            'Stock balances will be increased and inventory movements recorded. This cannot be undone.',
        })}
        confirmText={t('goodsReceipts.postReceipt', { defaultValue: 'Post' })}
        cancelBtnText={t('goodsReceipts.form.cancel', { defaultValue: 'Cancel' })}
        isLoading={postReceipt.isPending}
        handleConfirm={handlePost}
      />
      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        destructive
        title={t('goodsReceipts.dialog.cancelTitle', { defaultValue: 'Cancel this receipt?' })}
        desc={t('goodsReceipts.dialog.cancelDesc', {
          defaultValue: 'The draft goods receipt will be marked cancelled.',
        })}
        confirmText={t('goodsReceipts.cancelReceipt', { defaultValue: 'Cancel receipt' })}
        cancelBtnText={t('goodsReceipts.form.cancel', { defaultValue: 'Keep draft' })}
        isLoading={cancelReceipt.isPending}
        handleConfirm={handleCancel}
      />
    </>
  )
}
