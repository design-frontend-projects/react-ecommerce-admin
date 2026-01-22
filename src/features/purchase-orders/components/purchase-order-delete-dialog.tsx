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
import { usePOContext } from './purchase-orders-provider'

export function PODeleteDialog() {
  const { open, setOpen, currentRow } = usePOContext()
  const deleteMutation = useDeletePurchaseOrder()

  const onDelete = async () => {
    if (!currentRow) return
    try {
      await deleteMutation.mutateAsync(currentRow.po_id)
      toast.success('Purchase order deleted successfully')
      setOpen(null)
    } catch (error: any) {
      toast.error('Error', {
        description: error.message || 'Failed to delete purchase order',
      })
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.error(error)
      }
    }
  }

  return (
    <AlertDialog
      open={open === 'delete'}
      onOpenChange={(v) => !v && setOpen(null)}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the
            purchase order PO-{currentRow?.po_id} and remove it from our
            servers.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onDelete} className='bg-red-600'>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
