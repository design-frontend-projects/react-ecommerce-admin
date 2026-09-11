import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
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
          title: t('stockTransfers.workflow.approveDialog.title', 'Approve Stock Transfer?'),
          desc: t(
            'stockTransfers.workflow.approveDialog.desc',
            'Approve transfer {{ref}} to authorize stock picking and shipping.',
            { ref: transferLabel }
          ),
          confirmText: t('stockTransfers.workflow.approveDialog.confirmText', 'Approve Transfer'),
          destructive: false,
        }
      case 'pick':
        return {
          title: t('stockTransfers.workflow.pickDialog.title', 'Mark Stock as Picked?'),
          desc: t(
            'stockTransfers.workflow.pickDialog.desc',
            'Confirm that all items for transfer {{ref}} have been picked from warehouse locations.',
            { ref: transferLabel }
          ),
          confirmText: t('stockTransfers.workflow.pickDialog.confirmText', 'Mark Picked'),
          destructive: false,
        }
      case 'ship':
        return {
          title: t('stockTransfers.workflow.shipDialog.title', 'Ship Stock Transfer?'),
          desc: t(
            'stockTransfers.workflow.shipDialog.desc',
            'Dispatch transfer {{ref}}. Status will be updated to in-transit.',
            { ref: transferLabel }
          ),
          confirmText: t('stockTransfers.workflow.shipDialog.confirmText', 'Ship Transfer'),
          destructive: false,
        }
      case 'receive':
        return {
          title: t('stockTransfers.workflow.receiveDialog.title', 'Receive & Post Stock Transfer?'),
          desc: t(
            'stockTransfers.workflow.receiveDialog.desc',
            'Receive stock transfer {{ref}} at the destination. This will trigger inventory balance updates and stock movements.',
            { ref: transferLabel }
          ),
          confirmText: t('stockTransfers.workflow.receiveDialog.confirmText', 'Receive & Post Stock'),
          destructive: false,
        }
      case 'complete':
        return {
          title: t('stockTransfers.workflow.completeDialog.title', 'Mark Transfer as Complete?'),
          desc: t(
            'stockTransfers.workflow.completeDialog.desc',
            'Close out stock transfer {{ref}}. All reconciliation and movements are finalized.',
            { ref: transferLabel }
          ),
          confirmText: t('stockTransfers.workflow.completeDialog.confirmText', 'Complete Transfer'),
          destructive: false,
        }
      case 'cancel':
        return {
          title: t('stockTransfers.workflow.cancelDialog.title', 'Cancel Stock Transfer?'),
          desc: t(
            'stockTransfers.workflow.cancelDialog.desc',
            'Are you sure you want to cancel transfer {{ref}}? No items will be moved.',
            { ref: transferLabel }
          ),
          confirmText: t('stockTransfers.workflow.cancelDialog.confirmText', 'Yes, Cancel Transfer'),
          destructive: true,
        }
      default:
        return {
          title: '',
          desc: '',
          confirmText: t('common.confirm', 'Confirm'),
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
            {t('stockTransfers.workflow.cancel', 'Cancel Transfer')}
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
            {t('stockTransfers.workflow.approve', 'Approve Transfer')}
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
            {t('stockTransfers.workflow.pick', 'Mark Picked')}
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
            {t('stockTransfers.workflow.ship', 'Ship Transfer')}
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
            {t('stockTransfers.workflow.receive', 'Receive & Post Transfer')}
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
            {t('stockTransfers.workflow.complete', 'Complete Transfer')}
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

