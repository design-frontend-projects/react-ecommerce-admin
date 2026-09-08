import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AlertTriangle } from 'lucide-react'
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
  const { t } = useTranslation()
  const { open, setOpen, currentRow } = usePriceListContext()
  const deleteMutation = useDeletePriceList()

  const isOpen = open === 'delete' && Boolean(currentRow)

  const onDelete = async () => {
    if (!currentRow) return
    try {
      await deleteMutation.mutateAsync(currentRow.id)
      toast.success(
        t('priceList.deleteSuccess', {
          defaultValue: 'Price list and associated variant rules deleted successfully',
        })
      )
      setOpen(null)
    } catch (error: unknown) {
      toast.error(
        (error as Error)?.message ||
          t('common.errorOccurred', { defaultValue: 'Something went wrong. Please try again.' })
      )
    }
  }

  const itemsCount = currentRow?.price_list_items?.length || 0

  return (
    <AlertDialog open={isOpen} onOpenChange={(v) => !v && setOpen(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className='flex items-center gap-2 text-destructive'>
            <AlertTriangle className='h-5 w-5' />
            {t('priceList.deleteTitle', { defaultValue: 'Delete Price List' })}
          </AlertDialogTitle>
          <AlertDialogDescription className='space-y-2'>
            <p>
              {t('priceList.deleteConfirm', {
                defaultValue:
                  'Are you sure you want to delete this price list rule? This action cannot be undone.',
              })}
            </p>
            {currentRow && (
              <div className='rounded-md border bg-muted/40 p-3 text-sm font-medium'>
                <span className='font-bold text-foreground'>
                  {currentRow.products?.name || 'Product'}
                </span>
                {currentRow.type && <span className='text-muted-foreground'> • {currentRow.type}</span>}
                {itemsCount > 0 && (
                  <p className='text-xs text-muted-foreground mt-1'>
                    {itemsCount}{' '}
                    {t('priceList.deleteVariantNotice', {
                      defaultValue: 'variant price override records (price_list_items) will also be deleted.',
                    })}
                  </p>
                )}
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onDelete}
            disabled={deleteMutation.isPending}
            className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
          >
            {deleteMutation.isPending
              ? t('common.deleting', { defaultValue: 'Deleting...' })
              : t('common.delete', { defaultValue: 'Delete' })}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
