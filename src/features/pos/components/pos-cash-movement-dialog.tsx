import { useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, DollarSign } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePosStore } from '../store/use-pos-store'
import { useCashMovementMutation } from '../hooks/use-pos-queries'

interface PosCashMovementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PosCashMovementDialog({
  open,
  onOpenChange,
}: PosCashMovementDialogProps) {
  const { session } = usePosStore()
  const [type, setType] = useState<'in' | 'out'>('in')
  const [reason, setReason] = useState<string>('adjustment')
  const [amount, setAmount] = useState<string>('')
  const [notes, setNotes] = useState<string>('')

  const cashMutation = useCashMovementMutation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session?.id) {
      toast.error('No active session found')
      return
    }

    const numAmount = Number(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a valid positive amount')
      return
    }

    try {
      await cashMutation.mutateAsync({
        sessionId: session.id,
        type,
        reason: reason as any,
        amount: numAmount,
        notes: notes.trim() || undefined,
      })

      toast.success(
        `Recorded ${type === 'in' ? 'Cash In' : 'Cash Out'} of $${numAmount.toFixed(2)}`
      )
      setAmount('')
      setNotes('')
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err.message || 'Failed to record cash movement')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <div className='flex items-center gap-2'>
            <DollarSign className='h-5 w-5 text-primary' />
            <DialogTitle>Drawer Cash In / Out</DialogTitle>
          </div>
          <DialogDescription>
            Record non-sale cash movements in or out of the active till drawer.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='space-y-4 py-2'>
          <Tabs
            value={type}
            onValueChange={(val) => {
              setType(val as 'in' | 'out')
              setReason(val === 'in' ? 'income' : 'expense')
            }}
            className='w-full'
          >
            <TabsList className='grid w-full grid-cols-2'>
              <TabsTrigger value='in' className='gap-2 text-emerald-600 dark:text-emerald-400'>
                <ArrowDownLeft className='h-4 w-4' />
                Cash In (Paid In)
              </TabsTrigger>
              <TabsTrigger value='out' className='gap-2 text-rose-600 dark:text-rose-400'>
                <ArrowUpRight className='h-4 w-4' />
                Cash Out (Paid Out)
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className='space-y-2'>
            <Label htmlFor='movementReason'>Reason *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id='movementReason'>
                <SelectValue placeholder='Select reason' />
              </SelectTrigger>
              <SelectContent>
                {type === 'in' ? (
                  <>
                    <SelectItem value='income'>General Income</SelectItem>
                    <SelectItem value='customer_payment'>Customer Payment on Account</SelectItem>
                    <SelectItem value='adjustment'>Float Top-Up / Adjustment</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value='expense'>Store Expense / Petty Cash</SelectItem>
                    <SelectItem value='payout'>Bank Deposit / Safe Drop</SelectItem>
                    <SelectItem value='supplier_payment'>Supplier Cash Payment</SelectItem>
                    <SelectItem value='adjustment'>Float Reduction / Adjustment</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='amount'>Amount *</Label>
            <div className='relative'>
              <DollarSign className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
              <Input
                id='amount'
                type='number'
                step='0.01'
                min='0.01'
                placeholder='0.00'
                className='pl-9 text-lg font-semibold'
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
                required
              />
            </div>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='notes'>Notes / Description</Label>
            <Textarea
              id='notes'
              placeholder='Specify reason or attach receipt voucher reference...'
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <DialogFooter className='gap-2 sm:gap-0 pt-2'>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type='submit'
              disabled={cashMutation.isPending || !amount}
              className={
                type === 'in'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-rose-600 hover:bg-rose-700 text-white'
              }
            >
              {cashMutation.isPending
                ? 'Recording...'
                : type === 'in'
                ? 'Confirm Cash In'
                : 'Confirm Cash Out'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
