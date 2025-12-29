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
import { useDeletePriceList } from '../hooks/use-price-list'
import { usePriceListContext } from './price-list-provider'

export function PriceListDeleteDialog() {
  const { open, setOpen, currentRow } = usePriceListContext()
  const deleteMutation = useDeletePriceList()

  const isOpen = open === 'delete'

  const onDelete = async () => {
    if (currentRow) {
      try {
        await deleteMutation.mutateAsync(currentRow.price_id)
        toast.success('Price rule deleted successfully')
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
            This action cannot be undone. This will permanently delete the price
            rule
            {currentRow?.products?.name ? (
              <span className='font-medium text-foreground'>
                {` for "${currentRow.products.name}"`}
              </span>
            ) : (
              ''
            )}
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
