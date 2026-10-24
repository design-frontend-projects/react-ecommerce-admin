import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  Calendar,
  Receipt,
  User,
  ShieldAlert,
  Loader2,
  ArrowRight,
  Package,
} from 'lucide-react'
import { RefundStatusBadge } from './RefundStatusBadge'
import { ManagerPinModal } from './ManagerPinModal'
import {
  useRefundDetails,
  useApproveRefund,
  useRejectRefund,
  useExecuteRefund,
  useCancelRefund,
  useCanRefundAction,
} from '../hooks/useRefunds'

interface RefundDetailDialogProps {
  refundId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RefundDetailDialog({
  refundId,
  open,
  onOpenChange,
}: RefundDetailDialogProps) {
  const { data: refund, isLoading } = useRefundDetails(refundId)

  // Action mutations
  const approveMutation = useApproveRefund()
  const rejectMutation = useRejectRefund()
  const executeMutation = useExecuteRefund()
  const cancelMutation = useCancelRefund()

  // Strict permission checks for button visibility
  const canApprove = useCanRefundAction('approve')
  const canReject = useCanRefundAction('reject')
  const canExecute = useCanRefundAction('execute')
  const canCancel = useCanRefundAction('cancel')

  // Modals state
  const [pinModalOpen, setPinModalOpen] = useState(false)
  const [pinAction, setPinAction] = useState<'approve' | 'execute' | null>(null)
  const [rejectReasonPrompt, setRejectReasonPrompt] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [pinError, setPinError] = useState<string | null>(null)

  if (!open || !refundId) return null

  const handleApproveClick = () => {
    setPinAction('approve')
    setPinModalOpen(true)
  }

  const handleExecuteClick = () => {
    setPinAction('execute')
    setPinModalOpen(true)
  }

  const handlePinSubmit = async (pin: string) => {
    setPinError(null)
    try {
      if (pinAction === 'approve') {
        await approveMutation.mutateAsync({ refundId, pin })
        setPinModalOpen(false)
      } else if (pinAction === 'execute') {
        await executeMutation.mutateAsync({ refundId, pin })
        setPinModalOpen(false)
      }
    } catch (err: any) {
      setPinError(err.message || 'Authorization failed')
    }
  }

  const handleConfirmReject = async () => {
    if (!rejectionReason.trim()) return
    await rejectMutation.mutateAsync({
      refundId,
      rejectionReason,
    })
    setRejectReasonPrompt(false)
    setRejectionReason('')
  }

  const handleCancelClick = async () => {
    const reason = prompt('Reason for cancelling this refund:')
    if (reason && reason.trim()) {
      await cancelMutation.mutateAsync({
        refundId,
        cancellationReason: reason,
      })
    }
  }

  const isMutating =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    executeMutation.isPending ||
    cancelMutation.isPending

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-6">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-primary" />
                <DialogTitle className="text-lg">
                  Refund {refund?.refund_number || 'Details'}
                </DialogTitle>
              </div>
              {refund && <RefundStatusBadge status={refund.status} />}
            </div>
            <DialogDescription>
              Original Sales Invoice: <span className="font-semibold text-foreground">{refund?.sales_invoices?.invoice_no}</span>
            </DialogDescription>
          </DialogHeader>

          {isLoading || !refund ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-sm">
              {/* Financial Highlight */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-muted/30 p-3 rounded-lg border">
                <div>
                  <span className="text-[11px] text-muted-foreground block">Requested</span>
                  <span className="text-base font-bold text-foreground">
                    ${Number(refund.requested_amount).toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">Approved</span>
                  <span className="text-base font-bold text-foreground">
                    ${Number(refund.approved_amount).toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">Method</span>
                  <Badge variant="outline" className="text-xs uppercase font-medium">
                    {refund.refund_method || 'N/A'}
                  </Badge>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">Restock</span>
                  <Badge
                    variant={refund.inventory_return_required ? 'secondary' : 'outline'}
                    className="text-xs font-normal"
                  >
                    {refund.inventory_return_status}
                  </Badge>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                  Refund Items ({refund.refund_items?.length || 0})
                </h4>
                <div className="border rounded-lg divide-y bg-card overflow-hidden">
                  {refund.refund_items?.map((item) => (
                    <div key={item.id} className="p-3 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-medium text-foreground">
                          {item.product_name_snapshot || 'Product Item'}
                        </div>
                        <div className="text-muted-foreground font-mono text-[11px]">
                          SKU: {item.sku_snapshot || 'N/A'} • {item.variant_name_snapshot || ''}
                        </div>
                        <div className="flex gap-2 mt-1">
                          <span className="text-muted-foreground">
                            Qty: <strong className="text-foreground">{Number(item.refund_quantity)}</strong>
                          </span>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-muted-foreground">
                            Disposition: <strong className="text-foreground capitalize">{item.disposition || 'resalable'}</strong>
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-foreground block">
                          ${Number(item.refund_amount).toFixed(2)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          @ ${Number(item.unit_price).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reason / Notes */}
              {(refund.reason || refund.notes || refund.rejection_reason) && (
                <div className="space-y-2 bg-muted/20 p-3 rounded-lg border text-xs">
                  {refund.reason && (
                    <div>
                      <strong className="text-foreground">Reason:</strong>{' '}
                      <span className="text-muted-foreground">{refund.reason}</span>
                    </div>
                  )}
                  {refund.notes && (
                    <div>
                      <strong className="text-foreground">Notes:</strong>{' '}
                      <span className="text-muted-foreground">{refund.notes}</span>
                    </div>
                  )}
                  {refund.rejection_reason && (
                    <div className="text-rose-600 dark:text-rose-400">
                      <strong>Rejection Reason:</strong> {refund.rejection_reason}
                    </div>
                  )}
                </div>
              )}

              {/* Rejection Prompt Form */}
              {rejectReasonPrompt && (
                <div className="p-3 border border-rose-300 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20 rounded-lg space-y-2">
                  <h5 className="font-semibold text-xs text-rose-700 dark:text-rose-300">
                    Provide Rejection Reason
                  </h5>
                  <input
                    type="text"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Enter reason for rejecting this refund..."
                    className="w-full text-xs p-2 border rounded bg-background"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setRejectReasonPrompt(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleConfirmReject}
                      disabled={!rejectionReason.trim() || isMutating}
                    >
                      Confirm Rejection
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="border-t pt-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              {/* Cancel action: hidden if unauthorized or refund in non-cancellable state */}
              {canCancel && refund && ['draft', 'requested', 'pending_approval', 'approved'].includes(refund.status) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCancelClick}
                  disabled={isMutating}
                  className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  Cancel Refund
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Reject button: strictly hidden if unauthorized or not pending_approval */}
              {canReject && refund?.status === 'pending_approval' && !rejectReasonPrompt && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => setRejectReasonPrompt(true)}
                  disabled={isMutating}
                  className="text-xs"
                >
                  <XCircle className="w-3.5 h-3.5 mr-1" />
                  Reject
                </Button>
              )}

              {/* Approve button: strictly hidden if unauthorized or not pending_approval */}
              {canApprove && refund?.status === 'pending_approval' && (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleApproveClick}
                  disabled={isMutating}
                  className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Approve Refund
                </Button>
              )}

              {/* Execute button: strictly hidden if unauthorized or not approved */}
              {canExecute && refund?.status === 'approved' && (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleExecuteClick}
                  disabled={isMutating}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Play className="w-3.5 h-3.5 mr-1" />
                  Disburse & Restock
                </Button>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ManagerPinModal
        open={pinModalOpen}
        onOpenChange={setPinModalOpen}
        title={pinAction === 'approve' ? 'Approve Refund Authorization' : 'Execute Refund Payout'}
        description={
          pinAction === 'approve'
            ? 'Enter manager authorization PIN to approve this refund request.'
            : 'Enter PIN to confirm payout and update inventory balances.'
        }
        onSubmit={handlePinSubmit}
        isLoading={isMutating}
        error={pinError}
      />
    </>
  )
}
