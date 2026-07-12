// Admin correction dialog for closed shifts (specs/026 FR-6). Effective
// values are updated on the shift row; the originals stay frozen and the
// change is appended to the immutable audit trail.
import { useState } from 'react'
import { Loader2, PencilLine } from 'lucide-react'
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
import { useCorrectShift } from '../api/shift-hooks'
import { toMoneyString, type ShiftDto } from '../data/shift-schemas'
import { formatCurrency } from '../lib/formatters'

interface ShiftCorrectionDialogProps {
  shift: ShiftDto | null
  onOpenChange: (open: boolean) => void
}

export function ShiftCorrectionDialog({
  shift,
  onOpenChange,
}: ShiftCorrectionDialogProps) {
  // Remount the form per shift so state initializes from that shift's values.
  return (
    <CorrectionDialogContent
      key={shift?.id ?? 'none'}
      shift={shift}
      onOpenChange={onOpenChange}
    />
  )
}

function CorrectionDialogContent({
  shift,
  onOpenChange,
}: ShiftCorrectionDialogProps) {
  const { t } = useTranslation()
  const [openingCash, setOpeningCash] = useState(shift?.openingCash ?? '')
  const [closingCash, setClosingCash] = useState(shift?.closingCash ?? '')
  const [reason, setReason] = useState('')
  const correctShift = useCorrectShift()

  const reasonTooShort = reason.trim().length < 5
  const hasChange =
    !!shift &&
    (openingCash !== shift.openingCash ||
      closingCash !== (shift.closingCash ?? ''))

  const handleSubmit = async () => {
    if (!shift || reasonTooShort || !hasChange) return
    try {
      await correctShift.mutateAsync({
        shiftId: shift.id,
        openingCash:
          openingCash !== shift.openingCash
            ? toMoneyString(Number(openingCash))
            : null,
        closingCash:
          closingCash !== (shift.closingCash ?? '') && closingCash !== ''
            ? toMoneyString(Number(closingCash))
            : null,
        reason: reason.trim(),
      })
      toast.success(t('shifts.correction.success', 'Shift corrected'))
      onOpenChange(false)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t('shifts.correction.error', 'Unable to correct shift')
      )
    }
  }

  return (
    <Dialog open={!!shift} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <PencilLine className='h-5 w-5 text-muted-foreground' />
            {t('shifts.correction.title', 'Correct Shift Amounts')}
          </DialogTitle>
          <DialogDescription>
            {t(
              'shifts.correction.desc',
              'Original values are preserved and every correction is recorded in the audit log.'
            )}
          </DialogDescription>
        </DialogHeader>

        {shift && (
          <div className='space-y-4'>
            <div className='rounded-lg bg-muted/50 p-3 text-sm'>
              <p className='text-muted-foreground'>
                {t('shifts.correction.original', 'Originally recorded')}
              </p>
              <p className='font-medium'>
                {t('shifts.correction.originalClosing', 'Closing')}:{' '}
                {shift.originalClosingCash !== null
                  ? formatCurrency(Number(shift.originalClosingCash))
                  : '—'}{' '}
                · {t('shifts.correction.originalVariance', 'Variance')}:{' '}
                {shift.originalVariance !== null
                  ? formatCurrency(Number(shift.originalVariance))
                  : '—'}
              </p>
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='correction-opening'>
                  {t('shifts.correction.openingCash', 'Opening cash')}
                </Label>
                <Input
                  id='correction-opening'
                  type='number'
                  step='0.01'
                  min='0'
                  value={openingCash}
                  onChange={(event) => setOpeningCash(event.target.value)}
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='correction-closing'>
                  {t('shifts.correction.closingCash', 'Closing cash')}
                </Label>
                <Input
                  id='correction-closing'
                  type='number'
                  step='0.01'
                  min='0'
                  value={closingCash}
                  onChange={(event) => setClosingCash(event.target.value)}
                />
              </div>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='correction-reason'>
                {t('shifts.correction.reason', 'Reason (required)')}
              </Label>
              <Textarea
                id='correction-reason'
                rows={3}
                placeholder={t(
                  'shifts.correction.reasonPlaceholder',
                  'Why is this correction needed?'
                )}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
              {reason.length > 0 && reasonTooShort && (
                <p className='text-sm text-destructive'>
                  {t(
                    'shifts.correction.reasonTooShort',
                    'Reason must be at least 5 characters.'
                  )}
                </p>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            type='button'
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={correctShift.isPending}
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            type='button'
            onClick={handleSubmit}
            disabled={reasonTooShort || !hasChange || correctShift.isPending}
            className='gap-2'
          >
            {correctShift.isPending && (
              <Loader2 className='h-4 w-4 animate-spin' />
            )}
            {t('shifts.correction.confirm', 'Save Correction')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
