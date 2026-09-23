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
  const { t } = useTranslation()
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
            <AlertDialogTitle>{t('inventoryTransactions.cancelDialog.title')}</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            {t('inventoryTransactions.cancelDialog.description')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className='space-y-2 py-2'>
          <Label htmlFor='cancel-reason'>{t('inventoryTransactions.cancelDialog.reasonLabel')}</Label>
          <Textarea
            id='cancel-reason'
            placeholder={t('inventoryTransactions.cancelDialog.reasonPlaceholder')}
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
            {t('inventoryTransactions.cancelDialog.back')}
          </Button>
          <Button
            variant='destructive'
            onClick={handleConfirm}
            disabled={cancelMutation.isPending}
          >
            {cancelMutation.isPending && (
              <Loader2 className='h-4 w-4 animate-spin me-1.5' />
            )}
            {t('inventoryTransactions.cancelDialog.confirmCancel')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
