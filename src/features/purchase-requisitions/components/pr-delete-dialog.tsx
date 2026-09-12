import { useTranslation } from 'react-i18next'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useDeleteRequisition } from '../hooks/use-purchase-requisitions'
import { useRequisitionsContext } from './provider'

export function PRDeleteDialog() {
  const { t } = useTranslation()
  const { open, setOpen, currentRow } = useRequisitionsContext()
  const deleteMutation = useDeleteRequisition()

  const isOpen = open === 'delete'

  if (!currentRow) return null

  const reqLabel = currentRow.requisition_number || 'Requisition'

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(currentRow.id)
      setOpen(null)
    } catch {
      // Error handled by hook toast
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={(v) => !v && setOpen(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('purchaseRequisitions.deleteDialog.title', 'Delete Purchase Requisition')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t(
              'purchaseRequisitions.deleteDialog.desc',
              'Are you sure you want to delete {{reqNumber}}? This action cannot be undone. All associated requested line items will be removed.',
              { reqNumber: reqLabel }
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>
            {t('common.cancel', 'Cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
          >
            {deleteMutation.isPending ? t('common.deleting', 'Deleting...') : t('common.delete', 'Delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
