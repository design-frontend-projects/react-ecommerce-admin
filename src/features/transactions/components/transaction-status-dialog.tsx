import { useState } from 'react'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
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
import { useUpdateFinancialTransactionStatus } from '../hooks/use-financial-transactions'
import { useTransactionsContext } from './transactions-provider'

export function TransactionStatusDialog() {
  const {
    isStatusOpen,
    setIsStatusOpen,
    selectedRow,
    targetStatus,
  } = useTransactionsContext()

  const [notes, setNotes] = useState('')
  const updateMutation = useUpdateFinancialTransactionStatus()

  const handleConfirm = () => {
    if (!selectedRow || !targetStatus) return

    updateMutation.mutate(
      {
        id: selectedRow.id,
        status: targetStatus,
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          setNotes('')
          setIsStatusOpen(false)
        },
      }
    )
  }

  const isPositive = targetStatus === 'completed'

  return (
    <Dialog open={isStatusOpen} onOpenChange={setIsStatusOpen}>
      <DialogContent className='sm:max-w-md p-6'>
        <DialogHeader className='space-y-1 border-b pb-3'>
          <div className='flex items-center space-x-2'>
            <div
              className={`p-1.5 rounded-md ${
                isPositive
                  ? 'bg-emerald-500/10 text-emerald-600'
                  : 'bg-destructive/10 text-destructive'
              }`}
            >
              {isPositive ? (
                <CheckCircle2 className='h-4 w-4' />
              ) : (
                <XCircle className='h-4 w-4' />
              )}
            </div>
            <DialogTitle className='text-base font-bold capitalize'>
              {targetStatus === 'completed'
                ? 'Complete Transaction'
                : targetStatus === 'voided'
                  ? 'Void Transaction'
                  : 'Cancel Transaction'}
            </DialogTitle>
          </div>
          <DialogDescription className='text-xs text-muted-foreground'>
            Are you sure you want to transition transaction{' '}
            <span className='font-mono font-medium text-foreground'>
              {selectedRow?.transaction_number}
            </span>{' '}
            to <span className='font-semibold'>{targetStatus}</span>?
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-3 py-2 text-xs'>
          <div className='space-y-1.5'>
            <Label htmlFor='status-notes' className='text-xs'>
              Audit Remarks / Reason (Optional)
            </Label>
            <Textarea
              id='status-notes'
              placeholder='Enter reason for this status change...'
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className='h-20 text-xs resize-none'
            />
          </div>
        </div>

        <DialogFooter className='border-t pt-3 flex items-center justify-end space-x-2'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='h-8 text-xs'
            onClick={() => setIsStatusOpen(false)}
          >
            Cancel
          </Button>
          <Button
            size='sm'
            className={`h-8 text-xs ${
              isPositive
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-destructive hover:bg-destructive/90 text-white'
            }`}
            disabled={updateMutation.isPending}
            onClick={handleConfirm}
          >
            {updateMutation.isPending && (
              <Loader2 className='mr-1.5 h-3.5 w-3.5 animate-spin' />
            )}
            Confirm Change
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
