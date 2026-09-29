import { useState } from 'react'
import {
  ArrowRightCircle,
  Check,
  CheckCheck,
  CheckCircle2,
  Clock,
  Package,
  Truck,
  X,
  XCircle,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Can } from '@/components/rbac/Can'
import {
  useApproveTransfer,
  useCancelTransfer,
  useCloseTransfer,
  usePickTransfer,
  useReceiveTransfer,
  useRejectTransfer,
  useShipTransfer,
  useSubmitTransfer,
} from '../hooks/use-stock-transfers'

interface TransferWorkflowActionsProps {
  transferId: string
  status: string
  referenceNo?: string | null
  onSuccess?: () => void
  className?: string
}

type ActionType =
  | 'submit'
  | 'approve'
  | 'reject'
  | 'pick'
  | 'ship'
  | 'receive'
  | 'close'
  | 'cancel'

export function TransferWorkflowActions({
  transferId,
  status,
  referenceNo,
  onSuccess,
  className,
}: TransferWorkflowActionsProps) {
  const { t } = useTranslation()
  const submitTransfer = useSubmitTransfer()
  const approveTransfer = useApproveTransfer()
  const rejectTransfer = useRejectTransfer()
  const pickTransfer = usePickTransfer()
  const shipTransfer = useShipTransfer()
  const receiveTransfer = useReceiveTransfer()
  const closeTransfer = useCloseTransfer()
  const cancelTransfer = useCancelTransfer()

  const [activeAction, setActiveAction] = useState<ActionType | null>(null)
  const [reasonInput, setReasonInput] = useState('')

  const isPending =
    submitTransfer.isPending ||
    approveTransfer.isPending ||
    rejectTransfer.isPending ||
    pickTransfer.isPending ||
    shipTransfer.isPending ||
    receiveTransfer.isPending ||
    closeTransfer.isPending ||
    cancelTransfer.isPending

  const isTerminal = ['closed', 'completed', 'cancelled', 'rejected'].includes(
    status
  )
  if (isTerminal) {
    return null
  }

  const transferLabel = referenceNo || `TR-${transferId.slice(0, 8)}`

  const handleConfirmAction = async () => {
    try {
      if (activeAction === 'submit') {
        await submitTransfer.mutateAsync(transferId)
      } else if (activeAction === 'approve') {
        await approveTransfer.mutateAsync(transferId)
      } else if (activeAction === 'reject') {
        await rejectTransfer.mutateAsync({
          id: transferId,
          reason: reasonInput || undefined,
        })
      } else if (activeAction === 'pick') {
        await pickTransfer.mutateAsync(transferId)
      } else if (activeAction === 'ship') {
        await shipTransfer.mutateAsync(transferId)
      } else if (activeAction === 'receive') {
        await receiveTransfer.mutateAsync(transferId)
      } else if (activeAction === 'close') {
        await closeTransfer.mutateAsync({
          id: transferId,
          notes: reasonInput || undefined,
        })
      } else if (activeAction === 'cancel') {
        await cancelTransfer.mutateAsync(transferId)
      }
      setActiveAction(null)
      setReasonInput('')
      onSuccess?.()
    } catch {
      setActiveAction(null)
    }
  }

  const canCancel = [
    'draft',
    'pending_approval',
    'approved',
    'ready_to_ship',
    'picked',
  ].includes(status)

  const isDraft = status === 'draft'
  const isPendingApproval = status === 'pending_approval'
  const isApproved = status === 'approved'
  const isReadyOrPicked = status === 'ready_to_ship' || status === 'picked'
  const isShipped =
    status === 'shipped' ||
    status === 'partially_shipped' ||
    status === 'in_transit'
  const isReceived = status === 'received' || status === 'partially_received'

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className || ''}`}>
      {/* Cancel Action (Available before goods dispatch) */}
      {canCancel && (
        <Can
          permission={['inventory.stock.manage', 'inventory.transfer.cancel']}
        >
          <Button
            variant='outline'
            size='sm'
            onClick={() => {
              setReasonInput('')
              setActiveAction('cancel')
            }}
            disabled={isPending}
            className='h-8 border-destructive/30 text-xs font-medium text-destructive hover:bg-destructive/10'
          >
            <X className='mr-1.5 h-3.5 w-3.5' />
            {t('stockTransfers.workflow.cancel', 'Cancel Transfer')}
          </Button>
        </Can>
      )}

      {/* Stage: Draft */}
      {isDraft && (
        <>
          <Can
            permission={['inventory.stock.manage', 'inventory.transfer.submit']}
          >
            <Button
              variant='outline'
              size='sm'
              onClick={() => setActiveAction('submit')}
              disabled={isPending}
              className='h-8 border-amber-500/40 text-xs text-amber-700 hover:bg-amber-500/10 dark:text-amber-300'
            >
              <Clock className='mr-1.5 h-3.5 w-3.5' />
              {t('stockTransfers.workflow.submit', 'Submit for Approval')}
            </Button>
          </Can>
          <Can
            permission={[
              'inventory.stock.manage',
              'inventory.transfer.approve',
            ]}
          >
            <Button
              size='sm'
              onClick={() => setActiveAction('approve')}
              disabled={isPending}
              className='h-8 bg-emerald-600 text-xs text-white hover:bg-emerald-700'
            >
              <Check className='mr-1.5 h-3.5 w-3.5' />
              {t('stockTransfers.workflow.approve', 'Approve Directly')}
            </Button>
          </Can>
        </>
      )}

      {/* Stage: Pending Approval */}
      {isPendingApproval && (
        <>
          <Can
            permission={['inventory.stock.manage', 'inventory.transfer.reject']}
          >
            <Button
              variant='outline'
              size='sm'
              onClick={() => {
                setReasonInput('')
                setActiveAction('reject')
              }}
              disabled={isPending}
              className='h-8 border-destructive/30 text-xs text-destructive hover:bg-destructive/10'
            >
              <XCircle className='mr-1.5 h-3.5 w-3.5' />
              {t('stockTransfers.workflow.reject', 'Reject')}
            </Button>
          </Can>
          <Can
            permission={[
              'inventory.stock.manage',
              'inventory.transfer.approve',
            ]}
          >
            <Button
              size='sm'
              onClick={() => setActiveAction('approve')}
              disabled={isPending}
              className='h-8 bg-emerald-600 text-xs text-white hover:bg-emerald-700'
            >
              <CheckCircle2 className='mr-1.5 h-3.5 w-3.5' />
              {t('stockTransfers.workflow.approve', 'Approve Transfer')}
            </Button>
          </Can>
        </>
      )}

      {/* Stage: Approved */}
      {isApproved && (
        <>
          <Can
            permission={['inventory.stock.manage', 'inventory.transfer.pick']}
          >
            <Button
              size='sm'
              onClick={() => setActiveAction('pick')}
              disabled={isPending}
              className='h-8 bg-cyan-600 text-xs text-white hover:bg-cyan-700'
            >
              <Package className='mr-1.5 h-3.5 w-3.5' />
              {t('stockTransfers.workflow.pick', 'Mark Picked')}
            </Button>
          </Can>
          <Can
            permission={['inventory.stock.manage', 'inventory.transfer.ship']}
          >
            <Button
              size='sm'
              onClick={() => setActiveAction('ship')}
              disabled={isPending}
              className='h-8 bg-orange-600 text-xs text-white hover:bg-orange-700'
            >
              <Truck className='mr-1.5 h-3.5 w-3.5' />
              {t('stockTransfers.workflow.ship', 'Ship Transfer')}
            </Button>
          </Can>
        </>
      )}

      {/* Stage: Picked / Ready to ship */}
      {isReadyOrPicked && (
        <Can permission={['inventory.stock.manage', 'inventory.transfer.ship']}>
          <Button
            size='sm'
            onClick={() => setActiveAction('ship')}
            disabled={isPending}
            className='h-8 bg-orange-600 text-xs text-white hover:bg-orange-700'
          >
            <Truck className='mr-1.5 h-3.5 w-3.5' />
            {t('stockTransfers.workflow.ship', 'Ship Transfer')}
          </Button>
        </Can>
      )}

      {/* Stage: Shipped / In-Transit */}
      {isShipped && (
        <Can
          permission={['inventory.stock.manage', 'inventory.transfer.receive']}
        >
          <Button
            size='sm'
            onClick={() => setActiveAction('receive')}
            disabled={isPending}
            className='h-8 bg-emerald-600 text-xs text-white hover:bg-emerald-700'
          >
            <ArrowRightCircle className='mr-1.5 h-3.5 w-3.5' />
            {t('stockTransfers.workflow.receive', 'Receive & Post Stock')}
          </Button>
        </Can>
      )}

      {/* Stage: Received -> Close */}
      {isReceived && (
        <Can
          permission={['inventory.stock.manage', 'inventory.transfer.close']}
        >
          <Button
            size='sm'
            onClick={() => {
              setReasonInput('')
              setActiveAction('close')
            }}
            disabled={isPending}
            className='h-8 bg-slate-800 text-xs text-white hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600'
          >
            <CheckCheck className='mr-1.5 h-3.5 w-3.5' />
            {t('stockTransfers.workflow.close', 'Close & Finalize Transfer')}
          </Button>
        </Can>
      )}

      {/* Action Dialog with optional reason / notes */}
      <Dialog
        open={Boolean(activeAction)}
        onOpenChange={(open) => {
          if (!open) {
            setActiveAction(null)
            setReasonInput('')
          }
        }}
      >
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>
              {activeAction === 'cancel' && 'Cancel Stock Transfer?'}
              {activeAction === 'reject' && 'Reject Stock Transfer'}
              {activeAction === 'submit' && 'Submit for Management Approval?'}
              {activeAction === 'approve' && 'Approve Stock Transfer?'}
              {activeAction === 'pick' && 'Mark Items as Picked?'}
              {activeAction === 'ship' && 'Ship Stock Transfer?'}
              {activeAction === 'receive' && 'Receive & Post Stock?'}
              {activeAction === 'close' && 'Close & Finalize Stock Transfer?'}
            </DialogTitle>
            <DialogDescription className='text-xs'>
              {activeAction === 'cancel' &&
                `Are you sure you want to cancel transfer ${transferLabel}? No inventory movements will be posted.`}
              {activeAction === 'reject' &&
                `Reject transfer request ${transferLabel}. Please provide a rejection reason.`}
              {activeAction === 'submit' &&
                `Submit transfer ${transferLabel} to management for approval before picking and shipment.`}
              {activeAction === 'approve' &&
                `Authorize transfer ${transferLabel} for warehouse picking and staging.`}
              {activeAction === 'pick' &&
                `Confirm that all line items for transfer ${transferLabel} have been picked from source bins.`}
              {activeAction === 'ship' &&
                `Dispatch transfer ${transferLabel}. Inventory will be deducted and status moved to In-Transit.`}
              {activeAction === 'receive' &&
                `Receive stock transfer ${transferLabel} at destination. Inventory ledger entries will be posted to increase destination on-hand.`}
              {activeAction === 'close' &&
                `Close out transfer ${transferLabel}. All reconciliations and logistics steps are complete.`}
            </DialogDescription>
          </DialogHeader>

          {/* Reason / Notes Input for Reject, Close, or Cancel */}
          {(activeAction === 'reject' ||
            activeAction === 'cancel' ||
            activeAction === 'close') && (
            <div className='space-y-1.5 py-2'>
              <Label htmlFor='actionReason' className='text-xs font-medium'>
                {activeAction === 'reject'
                  ? 'Rejection Reason (Required)'
                  : activeAction === 'cancel'
                    ? 'Cancellation Reason (Optional)'
                    : 'Closure Remarks (Optional)'}
              </Label>
              <Textarea
                id='actionReason'
                placeholder={
                  activeAction === 'reject'
                    ? 'e.g. Insufficient source stock, duplicate transfer...'
                    : activeAction === 'cancel'
                      ? 'Reason for cancelling...'
                      : 'Closing notes or reconciliation remarks...'
                }
                value={reasonInput}
                onChange={(e) => setReasonInput(e.target.value)}
                rows={2}
                className='text-xs'
              />
            </div>
          )}

          <DialogFooter className='flex gap-2 sm:justify-end'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => {
                setActiveAction(null)
                setReasonInput('')
              }}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type='button'
              size='sm'
              disabled={
                isPending || (activeAction === 'reject' && !reasonInput.trim())
              }
              onClick={handleConfirmAction}
              className={
                activeAction === 'cancel' || activeAction === 'reject'
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : ''
              }
            >
              {isPending
                ? 'Processing...'
                : activeAction === 'cancel'
                  ? 'Confirm Cancel'
                  : activeAction === 'reject'
                    ? 'Reject Transfer'
                    : activeAction === 'submit'
                      ? 'Submit'
                      : activeAction === 'approve'
                        ? 'Approve'
                        : activeAction === 'pick'
                          ? 'Mark Picked'
                          : activeAction === 'ship'
                            ? 'Ship'
                            : activeAction === 'receive'
                              ? 'Receive & Post'
                              : 'Close Transfer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
