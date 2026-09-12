import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
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
import { useDeletePurchaseOrder } from '../hooks/use-purchase-orders'
import { usePOContext } from './po-provider'

export function PODeleteDialog() {
  const { t } = useTranslation()
  const { open, setOpen, currentRow } = usePOContext()
  const deleteMutation = useDeletePurchaseOrder()

  const isOpen = open === 'delete'

  if (!currentRow) return null

  const poLabel = `PO-${String(currentRow.po_id).padStart(4, '0')}`

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(currentRow.po_id)
      toast.success(
        t('purchaseOrders.deleteDialog.deletedSuccess', '{{poLabel}} deleted successfully', { poLabel })
      )
      setOpen(null)
    } catch (error: unknown) {
      toast.error(t('common.error', 'Error'), {
        description:
          (error as Error)?.message || t('purchaseOrders.deleteDialog.failedToDelete', 'Failed to delete purchase order.'),
      })
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={(v) => !v && setOpen(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('purchaseOrders.deleteDialog.title', 'Delete Purchase Order')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t(
              'purchaseOrders.deleteDialog.confirmMessage',
              'Are you sure you want to delete {{poLabel}}? This action cannot be undone. All associated line items will also be deleted.',
              { poLabel }
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
