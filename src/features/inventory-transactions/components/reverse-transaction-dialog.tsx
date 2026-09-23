import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
import { Loader2, RotateCcw } from 'lucide-react'
import { useReverseInventoryTransaction } from '../hooks/use-inventory-transactions'

interface ReverseTransactionDialogProps {
  transactionId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function ReverseTransactionDialog({
  transactionId,
  open,
  onOpenChange,
  onSuccess,
}: ReverseTransactionDialogProps) {
  const { t } = useTranslation()
  const [reason, setReason] = useState('')
  const reverseMutation = useReverseInventoryTransaction()

  if (!open) return null

  const handleConfirm = () => {
    if (!transactionId || !reason.trim()) return

    reverseMutation.mutate(
      { id: transactionId, reason: reason.trim() },
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
          <div className='flex items-center gap-2 text-purple-600'>
            <RotateCcw className='h-5 w-5' />
            <AlertDialogTitle>{t('inventoryTransactions.reverseDialog.title')}</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            {t('inventoryTransactions.reverseDialog.description')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className='space-y-2 py-2'>
          <Label htmlFor='reversal-reason'>{t('inventoryTransactions.reverseDialog.reasonLabel')}</Label>
          <Textarea
            id='reversal-reason'
            placeholder={t('inventoryTransactions.reverseDialog.reasonPlaceholder')}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
        </div>

        <AlertDialogFooter>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={reverseMutation.isPending}
          >
            {t('inventoryTransactions.reverseDialog.cancel')}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!reason.trim() || reverseMutation.isPending}
            className='bg-purple-600 hover:bg-purple-700 text-white'
          >
            {reverseMutation.isPending && (
              <Loader2 className='h-4 w-4 animate-spin me-1.5' />
            )}
            {t('inventoryTransactions.reverseDialog.confirmReversal')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
