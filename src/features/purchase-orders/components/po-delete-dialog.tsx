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
  const { open, setOpen, currentRow } = usePOContext()
  const deleteMutation = useDeletePurchaseOrder()

  const isOpen = open === 'delete'

  if (!currentRow) return null

  const poLabel = `PO-${String(currentRow.po_id).padStart(4, '0')}`

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(currentRow.po_id)
      toast.success(`${poLabel} deleted successfully`)
      setOpen(null)
    } catch (error: unknown) {
      toast.error('Error', {
        description:
          (error as Error)?.message || 'Failed to delete purchase order.',
      })
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={(v) => !v && setOpen(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Purchase Order</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{poLabel}</strong>
            {currentRow.suppliers?.name ? (
              <>
                {' '}
                from <strong>{currentRow.suppliers.name}</strong>
              </>
            ) : null}
            ? This action cannot be undone. All associated line items will also
            be deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
