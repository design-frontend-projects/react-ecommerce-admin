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
import { useDeleteCustomerGroup } from '../hooks/use-customer-groups'
import { useCustomerGroupsContext } from './customer-groups-provider'

export function CustomerGroupsDeleteDialog() {
  const { t } = useTranslation()
  const { open, setOpen, currentRow } = useCustomerGroupsContext()
  const deleteMutation = useDeleteCustomerGroup()

  const isOpen = open === 'delete'

  const onDelete = async () => {
    if (currentRow) {
      try {
        await deleteMutation.mutateAsync(currentRow.group_id)
        toast.success(t('customerGroups.toast.deleted'))
        setOpen(null)
      } catch (error: unknown) {
        toast.error(t('customerGroups.toast.error'), {
          description:
            error instanceof Error
              ? error.message
              : t('customerGroups.toast.genericError'),
        })
      }
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={(v) => !v && setOpen(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('customerGroups.delete.title')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('customerGroups.delete.description')}{' '}
            <span className='font-medium text-foreground'>
              {currentRow?.name ? ` "${currentRow.name}"` : ''}
            </span>
            .
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>
            {t('customerGroups.delete.cancel')}
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
              ? t('customerGroups.delete.deleting')
              : t('customerGroups.delete.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
