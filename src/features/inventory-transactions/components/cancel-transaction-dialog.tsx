import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, XCircle } from 'lucide-react'
import { useCancelInventoryTransaction } from '../hooks/use-inventory-transactions'

interface CancelTransactionDialogProps {
  transactionId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CancelTransactionDialog({
  transactionId,
  open,
  onOpenChange,
  onSuccess,
}: CancelTransactionDialogProps) {
  const [reason, setReason] = useState('')
  const cancelMutation = useCancelInventoryTransaction()

  if (!open) return null

  const handleConfirm = () => {
    if (!transactionId) return

    cancelMutation.mutate(
      { id: transactionId, reason: reason.trim() || undefined },
      {
        onSuccess: () => {
          setReason('')
          onOpenChange(false)
          onSuccess?.()
        },
      }
    )
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className='flex items-center gap-2 text-destructive'>
            <XCircle className='h-5 w-5' />
            <AlertDialogTitle>Cancel Inventory Transaction</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            Are you sure you want to cancel this draft transaction? This will mark the
            transaction as cancelled without mutating any stock balances.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className='space-y-2 py-2'>
          <Label htmlFor='cancel-reason'>Reason for Cancellation (Optional)</Label>
          <Textarea
            id='cancel-reason'
            placeholder='e.g., Abandoned draft, incorrect order number...'
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
          />
        </div>

        <AlertDialogFooter>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={cancelMutation.isPending}
          >
            Back
          </Button>
          <Button
            variant='destructive'
            onClick={handleConfirm}
            disabled={cancelMutation.isPending}
          >
            {cancelMutation.isPending && (
              <Loader2 className='h-4 w-4 animate-spin me-1.5' />
            )}
            Confirm Cancel
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
