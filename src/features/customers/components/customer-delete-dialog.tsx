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
import { useDeleteCustomer } from '../hooks/use-customers'
import { useCustomersContext } from './customers-provider'

export function CustomerDeleteDialog() {
  const { t } = useTranslation()
  const { open, setOpen, currentRow } = useCustomersContext()
  const deleteMutation = useDeleteCustomer()

  const isOpen = open === 'delete'

  const onDelete = async () => {
    if (currentRow) {
      try {
        await deleteMutation.mutateAsync(currentRow.id || (currentRow as any).customer_id)
        toast.success(t('customers.toast.deleted', 'Customer deleted successfully'))
        setOpen(null)
      } catch (error: any) {
        toast.error(t('customers.toast.error', 'Error'), {
          description:
            error.message || t('common.errorOccurred', 'Something went wrong. Please try again.'),
        })
      }
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={(v) => !v && setOpen(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('customers.delete.title', 'Delete Customer')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('customers.delete.permanentWarning', 'This action cannot be undone. This will permanently delete the customer')}{' '}
            <span className='font-medium text-foreground'>
              {currentRow?.first_name
                ? `"${currentRow.first_name} ${currentRow.last_name}"`
                : ''}
            </span>
            .
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>
            {t('common.cancel', 'Cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              onDelete()
            }}
            className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending
              ? t('common.deleting', 'Deleting...')
              : t('common.delete', 'Delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
