import { useState } from 'react'
import { Check, X, Truck, Package, ArrowRightCircle, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Can } from '@/components/rbac/Can'
import {
  useApplyTransfer,
  useCancelTransfer,
} from '../hooks/use-stock-transfers'

interface TransferWorkflowActionsProps {
  transferId: string
  status: string
  referenceNo?: string | null
  onSuccess?: () => void
  className?: string
}

export function TransferWorkflowActions({
  transferId,
  status,
  referenceNo,
  onSuccess,
  className,
}: TransferWorkflowActionsProps) {
  const applyTransfer = useApplyTransfer()
  const cancelTransfer = useCancelTransfer()

  const [confirmApprove, setConfirmApprove] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)

  const handleApprove = async () => {
    try {
      await applyTransfer.mutateAsync(transferId)
      setConfirmApprove(false)
      onSuccess?.()
    } catch {
      setConfirmApprove(false)
    }
  }

  const handleCancel = async () => {
    try {
      await cancelTransfer.mutateAsync(transferId)
      setConfirmCancel(false)
      onSuccess?.()
    } catch {
      setConfirmCancel(false)
    }
  }

  const isTerminal = ['completed', 'received', 'cancelled', 'rejected'].includes(status)

  if (isTerminal) {
    return null
  }

  return (
    <div className={`flex items-center gap-2 flex-wrap ${className || ''}`}>
      {/* Cancel Action */}
      <Can permission={['inventory.stock.manage', 'inventory.transfer.cancel']}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setConfirmCancel(true)}
          disabled={cancelTransfer.isPending || applyTransfer.isPending}
          className="text-destructive hover:bg-destructive/10"
        >
          <X className="h-4 w-4 mr-1.5" />
          Cancel Transfer
        </Button>
      </Can>

      {/* Progress Actions */}
      {status === 'draft' && (
        <Can permission={['inventory.stock.manage', 'inventory.transfer.create']}>
          <Button
            size="sm"
            onClick={() => setConfirmApprove(true)}
            disabled={applyTransfer.isPending}
            className="bg-primary text-primary-foreground"
          >
            <Send className="h-4 w-4 mr-1.5" />
            Request & Apply Transfer
          </Button>
        </Can>
      )}

      {status === 'requested' && (
        <Can permission={['inventory.stock.manage', 'inventory.transfer.approve']}>
          <Button
            size="sm"
            onClick={() => setConfirmApprove(true)}
            disabled={applyTransfer.isPending}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Check className="h-4 w-4 mr-1.5" />
            Approve Transfer
          </Button>
        </Can>
      )}

      {status === 'approved' && (
        <Can permission={['inventory.stock.manage', 'inventory.transfer.pick']}>
          <Button
            size="sm"
            onClick={() => setConfirmApprove(true)}
            disabled={applyTransfer.isPending}
            className="bg-cyan-600 hover:bg-cyan-700 text-white"
          >
            <Package className="h-4 w-4 mr-1.5" />
            Mark Picked
          </Button>
        </Can>
      )}

      {status === 'picked' && (
        <Can permission={['inventory.stock.manage', 'inventory.transfer.ship']}>
          <Button
            size="sm"
            onClick={() => setConfirmApprove(true)}
            disabled={applyTransfer.isPending}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            <Truck className="h-4 w-4 mr-1.5" />
            Ship Transfer
          </Button>
        </Can>
      )}

      {status === 'in_transit' && (
        <Can permission={['inventory.stock.manage', 'inventory.transfer.receive']}>
          <Button
            size="sm"
            onClick={() => setConfirmApprove(true)}
            disabled={applyTransfer.isPending}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <ArrowRightCircle className="h-4 w-4 mr-1.5" />
            Receive & Post Transfer
          </Button>
        </Can>
      )}

      <ConfirmDialog
        open={confirmApprove}
        onOpenChange={setConfirmApprove}
        title="Apply / Post this transfer?"
        desc={`Stock movement for transfer ${referenceNo || transferId.slice(0, 8)} will be applied between stores. This action updates the inventory balances.`}
        confirmText="Confirm"
        isLoading={applyTransfer.isPending}
        handleConfirm={handleApprove}
      />

      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        destructive
        title="Cancel this transfer?"
        desc="This transfer will be marked as cancelled and no items will be moved."
        confirmText="Cancel Transfer"
        isLoading={cancelTransfer.isPending}
        handleConfirm={handleCancel}
      />
    </div>
  )
}
