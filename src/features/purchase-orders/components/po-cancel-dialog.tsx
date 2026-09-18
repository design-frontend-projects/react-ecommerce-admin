import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Ban } from 'lucide-react'
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
import { useUpdatePurchaseOrderStatus } from '../hooks/use-purchase-orders'
import { usePOContext } from './po-provider'

export function POCancelDialog() {
  const { t } = useTranslation()
  const { open, setOpen, currentRow } = usePOContext()
  const updateStatusMutation = useUpdatePurchaseOrderStatus()

  const isOpen = open === 'cancel'

  if (!currentRow) return null

  const poLabel = `PO-${String(currentRow.po_number ?? currentRow.po_id).padStart(4, '0')}`
  const poId = currentRow.id || currentRow.po_id
  const currentStatus = String(currentRow.lifecycle_status ?? currentRow.status).toLowerCase()
  const isReceivedOrPartial =
    currentStatus === 'received' ||
    currentStatus === 'partial' ||
    currentStatus === 'partially_received'

  const handleCancel = async () => {
    if (isReceivedOrPartial) return
    try {
      await updateStatusMutation.mutateAsync({
        id: poId,
        status: 'cancelled',
      })
      toast.success(
        t('purchaseOrders.cancelDialog.cancelledSuccess', '{{poLabel}} has been cancelled.', { poLabel })
      )
      setOpen(null)
    } catch (error: unknown) {
      toast.error(t('common.error', 'Error'), {
        description:
          (error as Error)?.message ||
          t('purchaseOrders.cancelDialog.failedToCancel', 'Failed to cancel purchase order.'),
      })
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={(v) => !v && setOpen(null)}>
      <AlertDialogContent className='max-w-md'>
        <AlertDialogHeader>
          <div className='flex items-center gap-2 text-amber-600 dark:text-amber-500'>
            <Ban className='h-5 w-5' />
            <AlertDialogTitle>
              {t('purchaseOrders.cancelDialog.title', 'Cancel Purchase Order')}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className='space-y-2 pt-2'>
            {isReceivedOrPartial ? (
              <p className='text-destructive font-medium'>
                {t(
                  'purchaseOrders.cancelDialog.cannotCancelReceived',
                  'This order cannot be cancelled because it is already received or partially received.'
                )}
              </p>
            ) : (
              <p>
                {t(
                  'purchaseOrders.cancelDialog.confirmMessage',
                  'Are you sure you want to cancel {{poLabel}}? This order will be marked as cancelled and shipment processing will halt.',
                  { poLabel }
                )}
              </p>
            )}
            {currentRow.suppliers?.name && (
              <p className='text-xs text-muted-foreground'>
                {t('purchaseOrders.cancelDialog.supplierLabel', 'Supplier:')}{' '}
                <span className='font-medium text-foreground'>{currentRow.suppliers.name}</span>
              </p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={updateStatusMutation.isPending}>
            {t('common.keepOrder', 'Keep Order')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleCancel}
            disabled={updateStatusMutation.isPending || isReceivedOrPartial}
            className='bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-700'
          >
            {updateStatusMutation.isPending
              ? t('common.cancelling', 'Cancelling...')
              : t('purchaseOrders.actions.confirmCancel', 'Confirm Cancellation')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
