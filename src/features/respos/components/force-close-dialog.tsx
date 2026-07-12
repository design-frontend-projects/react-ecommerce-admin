// Admin force-close dialog — unilateral close with a mandatory reason
// (specs/026 FR-6). The owner is notified server-side.
import { useState } from 'react'
import { AlertCircle, Loader2 } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import { useForceCloseShift } from '../api/shift-hooks'
import { toMoneyString, type ShiftDto } from '../data/shift-schemas'

interface ForceCloseDialogProps {
  shift: ShiftDto | null
  onOpenChange: (open: boolean) => void
}

export function ForceCloseDialog({
  shift,
  onOpenChange,
}: ForceCloseDialogProps) {
  const { t } = useTranslation()
  const [reason, setReason] = useState('')
  const [countedCash, setCountedCash] = useState('')
  const forceClose = useForceCloseShift()

  const reasonTooShort = reason.trim().length < 5

  const handleSubmit = async () => {
    if (!shift || reasonTooShort) return
    try {
      await forceClose.mutateAsync({
        shiftId: shift.id,
        reason: reason.trim(),
        countedCash: countedCash ? toMoneyString(Number(countedCash)) : null,
      })
      toast.success(t('shifts.forceClose.success', 'Shift force-closed'))
      setReason('')
      setCountedCash('')
      onOpenChange(false)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t('shifts.forceClose.error', 'Unable to force-close shift')
      )
    }
  }

  return (
    <Dialog open={!!shift} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <AlertCircle className='h-5 w-5 text-destructive' />
            {t('shifts.forceClose.title', 'Force-Close Shift')}
          </DialogTitle>
          <DialogDescription>
            {t(
              'shifts.forceClose.desc',
              'Close this shift on behalf of {{name}}. The employee will be notified and the shift will be flagged for review.',
              { name: shift?.employeeName ?? '—' }
            )}
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='force-close-counted'>
              {t('shifts.forceClose.countedCash', 'Counted cash (optional)')}
            </Label>
            <Input
              id='force-close-counted'
              type='number'
              step='0.01'
              min='0'
              placeholder='0.00'
              value={countedCash}
              onChange={(event) => setCountedCash(event.target.value)}
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='force-close-reason'>
              {t('shifts.forceClose.reason', 'Reason (required)')}
            </Label>
            <Textarea
              id='force-close-reason'
              rows={3}
              placeholder={t(
                'shifts.forceClose.reasonPlaceholder',
                'Why is this shift being force-closed?'
              )}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
            {reason.length > 0 && reasonTooShort && (
              <p className='text-sm text-destructive'>
                {t(
                  'shifts.forceClose.reasonTooShort',
                  'Reason must be at least 5 characters.'
                )}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type='button'
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={forceClose.isPending}
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            type='button'
            variant='destructive'
            onClick={handleSubmit}
            disabled={reasonTooShort || forceClose.isPending}
            className='gap-2'
          >
            {forceClose.isPending && (
              <Loader2 className='h-4 w-4 animate-spin' />
            )}
            {t('shifts.forceClose.confirm', 'Force-Close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
