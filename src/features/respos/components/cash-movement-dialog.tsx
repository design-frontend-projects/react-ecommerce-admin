// Paid-in / paid-out dialog for the active shift (specs/026 FR-3).
import { useState } from 'react'
import { ArrowDownRight, ArrowUpRight, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAddCashMovement } from '../api/shift-hooks'
import { toMoneyString } from '../data/shift-schemas'

const MOVEMENT_REASONS = [
  'income',
  'expense',
  'payout',
  'adjustment',
  'customer_payment',
  'supplier_payment',
] as const

type MovementReason = (typeof MOVEMENT_REASONS)[number]

interface CashMovementDialogProps {
  shiftId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CashMovementDialog({
  shiftId,
  open,
  onOpenChange,
}: CashMovementDialogProps) {
  const { t } = useTranslation()
  const [type, setType] = useState<'in' | 'out'>('in')
  const [reason, setReason] = useState<MovementReason>('income')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const addMovement = useAddCashMovement()

  const amountInvalid = !amount || Number(amount) <= 0

  const handleSubmit = async () => {
    if (!shiftId || amountInvalid) return
    try {
      await addMovement.mutateAsync({
        shiftId,
        type,
        reason,
        amount: toMoneyString(Number(amount)),
        note: note.trim() || null,
      })
      toast.success(t('shifts.movement.success', 'Cash movement recorded'))
      setAmount('')
      setNote('')
      onOpenChange(false)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t('shifts.movement.error', 'Unable to record cash movement')
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            {type === 'in' ? (
              <ArrowUpRight className='h-5 w-5 text-green-500' />
            ) : (
              <ArrowDownRight className='h-5 w-5 text-red-500' />
            )}
            {t('shifts.movement.title', 'Record Cash Movement')}
          </DialogTitle>
          <DialogDescription>
            {t(
              'shifts.movement.desc',
              'Record cash paid into or out of the register during this shift.'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label>{t('shifts.movement.type', 'Direction')}</Label>
              <Select
                value={type}
                onValueChange={(value) => setType(value as 'in' | 'out')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='in'>
                    {t('shifts.movement.paidIn', 'Paid In')}
                  </SelectItem>
                  <SelectItem value='out'>
                    {t('shifts.movement.paidOut', 'Paid Out')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-2'>
              <Label>{t('shifts.movement.reason', 'Reason')}</Label>
              <Select
                value={reason}
                onValueChange={(value) => setReason(value as MovementReason)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MOVEMENT_REASONS.map((movementReason) => (
                    <SelectItem key={movementReason} value={movementReason}>
                      {t(
                        `shifts.movement.reasons.${movementReason}`,
                        movementReason.replace('_', ' ')
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='movement-amount'>
              {t('shifts.movement.amount', 'Amount')}
            </Label>
            <Input
              id='movement-amount'
              type='number'
              step='0.01'
              min='0.01'
              placeholder='0.00'
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='movement-note'>
              {t('shifts.movement.note', 'Note (optional)')}
            </Label>
            <Textarea
              id='movement-note'
              rows={2}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type='button'
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={addMovement.isPending}
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            type='button'
            onClick={handleSubmit}
            disabled={amountInvalid || addMovement.isPending}
            className='gap-2'
          >
            {addMovement.isPending && (
              <Loader2 className='h-4 w-4 animate-spin' />
            )}
            {t('shifts.movement.confirm', 'Record Movement')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
