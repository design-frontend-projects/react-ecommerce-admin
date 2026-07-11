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
import { useDeleteCustomerCard } from '../hooks/use-customer-cards'
import { useCustomerCardsContext } from './customer-cards-provider'

export function CustomerCardsDeleteDialog() {
  const { t } = useTranslation()
  const { open, setOpen, currentRow } = useCustomerCardsContext()
  const deleteMutation = useDeleteCustomerCard()

  const isOpen = open === 'delete'

  const onDelete = async () => {
    if (currentRow) {
      try {
        await deleteMutation.mutateAsync(currentRow.card_id)
        toast.success(t('customerCards.toast.deleted'))
        setOpen(null)
      } catch (error: unknown) {
        toast.error(t('customerCards.toast.error'), {
          description:
            error instanceof Error
              ? error.message
              : t('customerCards.toast.genericError'),
        })
      }
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={(v) => !v && setOpen(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('customerCards.delete.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('customerCards.delete.description')}{' '}
            <span className='font-medium text-foreground'>
              {currentRow?.last_four_digits
                ? ` "${currentRow.last_four_digits}"`
                : ''}
            </span>
            .
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>
            {t('customerCards.delete.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              onDelete()
            }}
            className='text-destructive-foreground bg-destructive hover:bg-destructive/90'
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending
              ? t('customerCards.delete.deleting')
              : t('customerCards.delete.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
