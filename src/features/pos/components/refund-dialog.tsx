import { useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ManagerAuthDialog } from './manager-auth-dialog'

interface RefundDialogProps {
  transactionId?: string
}

const REFUND_REASONS = [
  'Defective / Damaged',
  'Wrong Item',
  'Customer Changed Mind',
  'Other',
]

export function RefundDialog({ transactionId }: RefundDialogProps) {
  const [open, setOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [reason, setReason] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { orgId, userId } = useAuth()

  const handleRefundAttempt = () => {
    if (!reason) {
      toast.error('Please select a reason for the refund.')
      return
    }
    setAuthOpen(true)
  }

  const handleRefund = async () => {
    if (!reason) {
      toast.error('Please select a reason for the refund.')
      return
    }

    if (!transactionId) {
      toast.error('No matching transaction ID found to refund.')
      return
    }

    setIsSubmitting(true)
    try {
      // Create a refund record adjusting the original transaction
      const { error } = await supabase.from('transactions').insert({
        tenant_id: orgId,
        clerk_user_id: userId,
        transaction_number: `REF-${Date.now()}`,
        transaction_type: 'return',
        status: 'completed',
        currency: 'USD',
        subtotal: 0,
        tax_amount: 0,
        discount_amount: 0,
        total_amount: 0,
        notes: `REFUND REASON: ${reason} - ${notes}\nREFUND FOR: ${transactionId}`,
      })

      if (error) throw error

      toast.success('Refund processed successfully.')
      setOpen(false)
      setReason('')
      setNotes('')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      toast.error('Failed to process refund: ' + message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant='outline' className='text-destructive'>
          <RotateCcw className='mr-2 h-4 w-4' />
          Issue Refund
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Process Refund</DialogTitle>
        </DialogHeader>

        <div className='space-y-4 py-4'>
          <div className='space-y-2'>
            <Label>Reason for Refund (Required)</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder='Select a reason...' />
              </SelectTrigger>
              <SelectContent>
                {REFUND_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className='space-y-2'>
            <Label>Additional Notes (Optional)</Label>
            <Textarea
              placeholder='Enter any additional context...'
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className='resize-none'
              rows={3}
            />
          </div>
        </div>

        <div className='flex justify-end gap-2'>
          <Button
            variant='outline'
            onClick={() => setOpen(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant='destructive'
            onClick={handleRefundAttempt}
            disabled={isSubmitting || !reason}
          >
            Process Refund
          </Button>
        </div>
      </DialogContent>
      <ManagerAuthDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        onSuccess={handleRefund}
      />
    </Dialog>
  )
}
