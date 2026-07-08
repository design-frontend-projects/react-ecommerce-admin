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
  useAdjustment,
  useApplyAdjustment,
  useCancelAdjustment,
} from '../hooks/use-stock-adjustments'
import type { AdjustmentListItem } from '../data/schema'

export function AdjustmentViewDialog({
  adjustment,
  open,
  onOpenChange,
}: {
  adjustment: AdjustmentListItem
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data: detail, isLoading } = useAdjustment(
    open ? adjustment.id : undefined
  )
  const applyAdjustment = useApplyAdjustment()
  const cancelAdjustment = useCancelAdjustment()
  const [confirmApply, setConfirmApply] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)

  const isDraft = adjustment.status === 'draft'

  const handleApply = async () => {
    try {
      await applyAdjustment.mutateAsync(adjustment.id)
      setConfirmApply(false)
      onOpenChange(false)
    } catch {
      setConfirmApply(false)
    }
  }

  const handleCancel = async () => {
    try {
      await cancelAdjustment.mutateAsync(adjustment.id)
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
              {adjustment.id.slice(0, 8)}
              <Badge variant='outline' className='capitalize'>
                {adjustment.type}
              </Badge>
              <Badge variant='secondary' className='capitalize'>
                {adjustment.status}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              {adjustment.stores?.name ?? '—'}
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
                    <TableHead className='text-end'>Before</TableHead>
                    <TableHead className='text-end'>After</TableHead>
                    <TableHead className='text-end'>Δ</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail?.stock_adjustment_items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {item.product_variants?.sku ?? item.product_variant_id}
                      </TableCell>
                      <TableCell className='text-end'>
                        {item.qty_before}
                      </TableCell>
                      <TableCell className='text-end'>
                        {item.qty_after}
                      </TableCell>
                      <TableCell
                        className={
                          item.qty_adjusted >= 0
                            ? 'text-end text-emerald-600'
                            : 'text-end text-rose-600'
                        }
                      >
                        {item.qty_adjusted > 0 ? '+' : ''}
                        {item.qty_adjusted}
                      </TableCell>
                      <TableCell className='capitalize text-muted-foreground'>
                        {item.reason ?? '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {adjustment.notes ? (
            <p className='text-sm text-muted-foreground'>{adjustment.notes}</p>
          ) : null}

          <DialogFooter>
            {isDraft ? (
              <Can permission='inventory.manage'>
                <Button
                  variant='outline'
                  onClick={() => setConfirmCancel(true)}
                  disabled={cancelAdjustment.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => setConfirmApply(true)}
                  disabled={applyAdjustment.isPending}
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
        title='Apply this adjustment?'
        desc='Stock balances will be updated and movements recorded. This cannot be undone.'
        confirmText='Apply'
        isLoading={applyAdjustment.isPending}
        handleConfirm={handleApply}
      />
      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        destructive
        title='Cancel this adjustment?'
        desc='The draft adjustment will be marked cancelled.'
        confirmText='Cancel adjustment'
        isLoading={cancelAdjustment.isPending}
        handleConfirm={handleCancel}
      />
    </>
  )
}
