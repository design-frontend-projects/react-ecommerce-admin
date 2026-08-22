import { useTranslation } from 'react-i18next'
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
import { useDeleteCategory } from '../hooks/use-categories'
import { useCategoriesContext } from './categories-provider'

export function CategoryDeleteDialog() {
  const { t } = useTranslation()
  const { open, setOpen, currentRow } = useCategoriesContext()
  const deleteMutation = useDeleteCategory()

  const isOpen = open === 'delete'

  const onDelete = async () => {
    if (currentRow) {
      try {
        await deleteMutation.mutateAsync(currentRow.id)
        setOpen(null)
      } catch {
        // Error toast handled by useDeleteCategory
      }
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={(v) => !v && setOpen(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('categories.delete.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('categories.delete.description')}
            <span className='font-medium text-foreground'>
              {currentRow?.name ? ` "${currentRow.name}"` : ''}
            </span>
            .
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>
            {t('common.cancel')}
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
              ? t('common.loading')
              : t('common.delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
