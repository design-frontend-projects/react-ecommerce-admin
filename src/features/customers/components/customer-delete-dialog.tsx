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
import { useDeleteCustomer } from '../hooks/use-customers'
import { useCustomersContext } from './customers-provider'

export function CustomerDeleteDialog() {
  const { open, setOpen, currentRow } = useCustomersContext()
  const deleteMutation = useDeleteCustomer()

  const isOpen = open === 'delete'

  const onDelete = async () => {
    if (currentRow) {
      try {
        await deleteMutation.mutateAsync(currentRow.customer_id)
        toast.success('Customer deleted successfully')
        setOpen(null)
      } catch (error: any) {
        toast.error('Error', {
          description:
            error.message || 'Something went wrong. Please try again.',
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
            customer
            <span className='font-medium text-foreground'>
              {currentRow?.first_name
                ? ` "${currentRow.first_name} ${currentRow.last_name}"`
                : ''}
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
