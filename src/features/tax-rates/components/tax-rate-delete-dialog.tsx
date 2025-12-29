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
import { useDeleteTaxRate } from '../hooks/use-tax-rates'
import { useTaxContext } from './tax-rates-provider'

export function TaxDeleteDialog() {
  const { open, setOpen, currentRow } = useTaxContext()
  const deleteMutation = useDeleteTaxRate()

  const onDelete = async () => {
    if (!currentRow) return
    try {
      await deleteMutation.mutateAsync(currentRow.tax_rate_id)
      toast.success('Tax rate deleted successfully')
      setOpen(null)
    } catch (error: any) {
      toast.error('Error', {
        description: error.message || 'Failed to delete tax rate',
      })
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
            This action cannot be undone. This will permanently delete the tax
            rate
            {currentRow?.tax_type} ({currentRow?.rate}%) and remove it from our
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
