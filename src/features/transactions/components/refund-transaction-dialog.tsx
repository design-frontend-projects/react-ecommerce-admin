import { useState } from 'react'
import { Loader2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { FinancialTransactionRow } from '../data/schema'
import { useRefundFinancialTransaction } from '../hooks/use-financial-transactions'
import { useTransactionsContext } from './transactions-provider'

interface RefundTransactionFormProps {
  selectedRow: FinancialTransactionRow
  onClose: () => void
}

function RefundTransactionForm({
  selectedRow,
  onClose,
}: RefundTransactionFormProps) {
  const [reason, setReason] = useState('')
  const [amount, setAmount] = useState<number>(selectedRow.total_amount)
  const refundMutation = useRefundFinancialTransaction()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason.trim() || amount <= 0) return

    refundMutation.mutate(
      {
        originalTransactionId: selectedRow.id,
        reason: reason.trim(),
        amount,
      },
      {
        onSuccess: () => {
          onClose()
        },
      }
    )
  }

  const formatAmount = (num: number, cur = 'USD') => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: cur,
      }).format(num)
    } catch {
      return `${cur} ${num.toFixed(2)}`
    }
  }

  return (
    <>
      <DialogHeader className='space-y-1 border-b pb-3'>
        <div className='flex items-center space-x-2'>
          <div className='p-1.5 rounded-md bg-purple-500/10 text-purple-600'>
            <RotateCcw className='h-4 w-4' />
          </div>
          <DialogTitle className='text-base font-bold'>
            Issue Refund
          </DialogTitle>
        </div>
        <DialogDescription className='text-xs text-muted-foreground'>
          Record a refund linked to parent transaction{' '}
          <span className='font-mono font-medium text-foreground'>
            {selectedRow.transaction_number}
          </span>
          .
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className='space-y-4 py-2 text-xs'>
        <div className='rounded-lg border bg-muted/20 p-3 space-y-1.5'>
          <div className='flex items-center justify-between'>
            <span className='text-muted-foreground'>Original Total:</span>
            <span className='font-bold text-foreground'>
              {formatAmount(
                selectedRow.total_amount,
                selectedRow.currency
              )}
            </span>
          </div>
          <div className='flex items-center justify-between text-[11px]'>
            <span className='text-muted-foreground'>Currency:</span>
            <span className='font-mono font-medium text-foreground'>
              {selectedRow.currency || 'USD'}
            </span>
          </div>
        </div>

        <div className='space-y-1.5'>
          <Label htmlFor='refund-amount' className='text-xs'>
            Refund Amount
          </Label>
          <Input
            id='refund-amount'
            type='number'
            step='0.01'
            min='0.01'
            max={selectedRow.total_amount}
            value={amount}
            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            className='h-8 text-xs font-semibold'
            required
          />
          <p className='text-[10px] text-muted-foreground'>
            You can issue a full refund or enter a partial refund amount.
          </p>
        </div>

        <div className='space-y-1.5'>
          <Label htmlFor='refund-reason' className='text-xs'>
            Reason for Refund
          </Label>
          <Textarea
            id='refund-reason'
            placeholder='Explain why this refund is being issued...'
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className='h-20 text-xs resize-none'
            required
          />
        </div>

        <DialogFooter className='border-t pt-3 flex items-center justify-end space-x-2'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='h-8 text-xs'
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type='submit'
            size='sm'
            className='h-8 text-xs bg-purple-600 hover:bg-purple-700 text-white'
            disabled={
              refundMutation.isPending || !reason.trim() || amount <= 0
            }
          >
            {refundMutation.isPending && (
              <Loader2 className='mr-1.5 h-3.5 w-3.5 animate-spin' />
            )}
            Confirm Refund
          </Button>
        </DialogFooter>
      </form>
    </>
  )
}

export function RefundTransactionDialog() {
  const { isRefundOpen, setIsRefundOpen, selectedRow } =
    useTransactionsContext()

  if (!selectedRow) return null

  return (
    <Dialog open={isRefundOpen} onOpenChange={setIsRefundOpen}>
      <DialogContent className='sm:max-w-md p-6'>
        {isRefundOpen && (
          <RefundTransactionForm
            key={selectedRow.id}
            selectedRow={selectedRow}
            onClose={() => setIsRefundOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
