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
import { useDeleteStore } from '../hooks/use-stores'
import { useStoresContext } from './stores-provider'

export function StoreDeleteDialog() {
  const { t } = useTranslation()
  const { open, setOpen, currentRow } = useStoresContext()
  const deleteMutation = useDeleteStore()

  const isOpen = open === 'delete'

  const onDelete = async () => {
    if (currentRow) {
      try {
        await deleteMutation.mutateAsync(currentRow.store_id)
        toast.success(t('stores.toast.deleted', 'Store deleted successfully'))
        setOpen(null)
      } catch (error: any) {
        toast.error(t('stores.toast.error', 'Error'), {
          description:
            error.message ||
            t(
              'stores.toast.errorDescription',
              'Something went wrong. Please try again.'
            ),
        })
      }
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={(v) => !v && setOpen(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('stores.delete.title', 'Are you sure?')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t(
              'stores.delete.description',
              'This action cannot be undone. This will permanently delete the store'
            )}
            {currentRow?.name && (
              <span className='font-medium text-foreground'>
                {` "${currentRow.name}"`}
              </span>
            )}
            .
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>
            {t('stores.delete.cancel', 'Cancel')}
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
              ? t('stores.delete.deleting', 'Deleting...')
              : t('stores.delete.confirm', 'Delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
