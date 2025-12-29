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
import { useDeleteSupplier } from '../hooks/use-suppliers'
import { useSuppliersContext } from './suppliers-provider'

export function SupplierDeleteDialog() {
  const { open, setOpen, currentRow } = useSuppliersContext()
  const deleteMutation = useDeleteSupplier()

  const isOpen = open === 'delete'

  const onDelete = async () => {
    if (currentRow) {
      try {
        await deleteMutation.mutateAsync(currentRow.supplier_id)
        toast.success('Supplier deleted successfully')
        setOpen(null)
      } catch (error: unknown) {
        toast.error('Error', {
          description:
            error && error instanceof Error
              ? error.message
              : 'Something went wrong. Please try again.',
        })
      }
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={(v) => !v && setOpen(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the
            supplier
            <span className='font-medium text-foreground'>
              {currentRow?.name ? ` "${currentRow.name}"` : ''}
            </span>
            .
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              onDelete()
            }}
            className='text-destructive-foreground bg-destructive hover:bg-destructive/90'
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
