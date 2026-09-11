import { useState } from 'react'
import {
  Check,
  X,
  Truck,
  Package,
  ArrowRightCircle,
  CheckCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Can } from '@/components/rbac/Can'
import {
  useApproveTransfer,
  useCancelTransfer,
  useCompleteTransfer,
  usePickTransfer,
  useReceiveTransfer,
  useShipTransfer,
} from '../hooks/use-stock-transfers'

interface TransferWorkflowActionsProps {
  transferId: string
  status: string
  referenceNo?: string | null
  onSuccess?: () => void
  className?: string
}

type ActionType = 'approve' | 'pick' | 'ship' | 'receive' | 'complete' | 'cancel'

export function TransferWorkflowActions({
  transferId,
  status,
  referenceNo,
  onSuccess,
  className,
}: TransferWorkflowActionsProps) {
  const approveTransfer = useApproveTransfer()
  const pickTransfer = usePickTransfer()
  const shipTransfer = useShipTransfer()
  const receiveTransfer = useReceiveTransfer()
  const completeTransfer = useCompleteTransfer()
  const cancelTransfer = useCancelTransfer()

  const [activeAction, setActiveAction] = useState<ActionType | null>(null)

  const isPending =
    approveTransfer.isPending ||
    pickTransfer.isPending ||
    shipTransfer.isPending ||
    receiveTransfer.isPending ||
    completeTransfer.isPending ||
    cancelTransfer.isPending

  const handleConfirmAction = async () => {
    try {
      if (activeAction === 'approve') {
        await approveTransfer.mutateAsync(transferId)
      } else if (activeAction === 'pick') {
        await pickTransfer.mutateAsync(transferId)
      } else if (activeAction === 'ship') {
        await shipTransfer.mutateAsync(transferId)
      } else if (activeAction === 'receive') {
        await receiveTransfer.mutateAsync(transferId)
      } else if (activeAction === 'complete') {
        await completeTransfer.mutateAsync(transferId)
      } else if (activeAction === 'cancel') {
        await cancelTransfer.mutateAsync(transferId)
      }
      setActiveAction(null)
      onSuccess?.()
    } catch {
      setActiveAction(null)
    }
  }

  const isTerminal = ['completed', 'cancelled', 'rejected'].includes(status)
  if (isTerminal) {
    return null
  }

  const transferLabel = referenceNo || `TR-${transferId.slice(0, 8)}`

  const getConfirmDialogDetails = () => {
    switch (activeAction) {
      case 'approve':
        return {
          title: 'Approve Stock Transfer?',
          desc: `Approve transfer ${transferLabel} to authorize stock picking and shipping.`,
          confirmText: 'Approve Transfer',
          destructive: false,
        }
      case 'pick':
        return {
          title: 'Mark Stock as Picked?',
          desc: `Confirm that all items for transfer ${transferLabel} have been picked from warehouse locations.`,
          confirmText: 'Mark Picked',
          destructive: false,
        }
      case 'ship':
        return {
          title: 'Ship Stock Transfer?',
          desc: `Dispatch transfer ${transferLabel}. Status will be updated to in-transit.`,
          confirmText: 'Ship Transfer',
          destructive: false,
        }
      case 'receive':
        return {
          title: 'Receive & Post Stock Transfer?',
          desc: `Receive stock transfer ${transferLabel} at the destination. This will trigger inventory balance updates and stock movements.`,
          confirmText: 'Receive & Post Stock',
          destructive: false,
        }
      case 'complete':
        return {
          title: 'Mark Transfer as Complete?',
          desc: `Close out stock transfer ${transferLabel}. All reconciliation and movements are finalized.`,
          confirmText: 'Complete Transfer',
          destructive: false,
        }
      case 'cancel':
        return {
          title: 'Cancel Stock Transfer?',
          desc: `Are you sure you want to cancel transfer ${transferLabel}? No items will be moved.`,
          confirmText: 'Yes, Cancel Transfer',
          destructive: true,
        }
      default:
        return {
          title: '',
          desc: '',
          confirmText: 'Confirm',
          destructive: false,
        }
    }
  }

  const modalDetails = getConfirmDialogDetails()

  return (
    <div className={`flex items-center gap-2 flex-wrap ${className || ''}`}>
      {/* Cancel Action (Available until received/completed) */}
      {status !== 'received' && (
        <Can permission={['inventory.stock.manage', 'inventory.transfer.cancel']}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveAction('cancel')}
            disabled={isPending}
            className="text-destructive hover:bg-destructive/10 border-destructive/30"
          >
            <X className="h-4 w-4 mr-1.5" />
            Cancel Transfer
          </Button>
        </Can>
      )}

      {/* Stage-specific primary action */}
      {status === 'draft' && (
        <Can permission={['inventory.stock.manage', 'inventory.transfer.approve']}>
          <Button
            size="sm"
            onClick={() => setActiveAction('approve')}
            disabled={isPending}
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
            onClick={() => setActiveAction('pick')}
            disabled={isPending}
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
            onClick={() => setActiveAction('ship')}
            disabled={isPending}
            className="bg-amber-600 hover:bg-amber-700 text-white"
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
            onClick={() => setActiveAction('receive')}
            disabled={isPending}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <ArrowRightCircle className="h-4 w-4 mr-1.5" />
            Receive & Post Transfer
          </Button>
        </Can>
      )}

      {status === 'received' && (
        <Can permission={['inventory.stock.manage', 'inventory.transfer.complete']}>
          <Button
            size="sm"
            onClick={() => setActiveAction('complete')}
            disabled={isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <CheckCheck className="h-4 w-4 mr-1.5" />
            Complete Transfer
          </Button>
        </Can>
      )}

      <ConfirmDialog
        open={Boolean(activeAction)}
        onOpenChange={(open) => {
          if (!open) setActiveAction(null)
        }}
        destructive={modalDetails.destructive}
        title={modalDetails.title}
        desc={modalDetails.desc}
        confirmText={modalDetails.confirmText}
        isLoading={isPending}
        handleConfirm={handleConfirmAction}
      />
    </div>
  )
}

