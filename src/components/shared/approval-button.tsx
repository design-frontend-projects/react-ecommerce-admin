import React, { useState } from 'react'
import { Check, X, ShieldCheck, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Can } from '@/components/rbac/Can'

interface ApprovalButtonGroupProps {
  permission?: string | string[]
  role?: string | string[]
  entityTitle?: string
  entityReference?: string
  amount?: number
  currency?: string
  onApprove: (comment?: string) => Promise<void> | void
  onReject: (reason: string) => Promise<void> | void
  disabled?: boolean
  isLoading?: boolean
  className?: string
}

export function ApprovalButtonGroup({
  permission,
  role,
  entityTitle = 'Document',
  entityReference = '',
  amount,
  currency = '$',
  onApprove,
  onReject,
  disabled = false,
  isLoading = false,
  className,
}: ApprovalButtonGroupProps) {
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [comment, setComment] = useState('')
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleConfirmApprove = async () => {
    setIsSubmitting(true)
    try {
      await onApprove(comment)
      setShowApproveDialog(false)
      setComment('')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmReject = async () => {
    if (!reason.trim()) return
    setIsSubmitting(true)
    try {
      await onReject(reason)
      setShowRejectDialog(false)
      setReason('')
    } finally {
      setIsSubmitting(false)
    }
  }

  const buttons = (
    <div className={`inline-flex items-center gap-2 ${className || ''}`}>
      <Button
        variant="destructive"
        size="sm"
        disabled={disabled || isLoading}
        onClick={() => setShowRejectDialog(true)}
        className="gap-1.5 shadow-xs"
      >
        <X className="h-4 w-4" />
        Reject
      </Button>

      <Button
        variant="default"
        size="sm"
        disabled={disabled || isLoading}
        onClick={() => setShowApproveDialog(true)}
        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-xs"
      >
        <Check className="h-4 w-4" />
        Approve
      </Button>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-emerald-600">
              <ShieldCheck className="h-5 w-5" />
              <DialogTitle>Confirm Approval</DialogTitle>
            </div>
            <DialogDescription>
              Are you sure you want to approve {entityTitle}{' '}
              {entityReference && <span className="font-semibold text-foreground">({entityReference})</span>}?
              {amount !== undefined && (
                <div className="mt-2 p-2.5 rounded-md bg-muted/60 text-sm">
                  <span className="text-muted-foreground">Total Valuation / Amount: </span>
                  <span className="font-bold text-foreground">
                    {currency}
                    {amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="approve-comment" className="text-xs">
              Approval Notes (Optional)
            </Label>
            <Textarea
              id="approve-comment"
              placeholder="Add optional notes for the audit trail..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowApproveDialog(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleConfirmApprove}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Approving...' : 'Confirm Approval'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <DialogTitle>Reject {entityTitle}</DialogTitle>
            </div>
            <DialogDescription>
              Please provide a reason for rejecting {entityReference || entityTitle}. This action will be logged in the audit trail.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="reject-reason" className="text-xs font-semibold">
              Rejection Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reject-reason"
              placeholder="State clear reasons for rejection..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              required
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmReject}
              disabled={isSubmitting || !reason.trim()}
            >
              {isSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )

  if (permission || role) {
    return (
      <Can permission={permission} role={role}>
        {buttons}
      </Can>
    )
  }

  return buttons
}
