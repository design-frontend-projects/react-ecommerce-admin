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
import { useBulkDeleteTaxRates } from '../hooks/use-tax-rates'
import { useTaxContext } from './tax-rates-provider'

export function TaxRateBulkDeleteDialog() {
  const { t } = useTranslation()
  const { open, setOpen, selectedRows, setSelectedRows } = useTaxContext()
  const bulkDeleteMutation = useBulkDeleteTaxRates()

  const onConfirm = async () => {
    if (selectedRows.length === 0) return
    try {
      const ids = selectedRows.map((r) => r.id)
      await bulkDeleteMutation.mutateAsync(ids)
      toast.success(
        t('taxRates.bulkDelete.success', {
          count: ids.length,
          defaultValue: `Successfully deleted ${ids.length} tax rates`,
        })
      )
      setSelectedRows([])
      setOpen(null)
    } catch (error: unknown) {
      toast.error(
        error instanceof Error
          ? error.message
          : t('taxRates.bulkDelete.failed', {
              defaultValue: 'Failed to delete selected tax rates',
            })
      )
    }
  }

  return (
    <AlertDialog
      open={open === 'bulk-delete'}
      onOpenChange={(v) => !v && setOpen(null)}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('taxRates.bulkDelete.title', 'Delete Selected Tax Rates?')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t(
              'taxRates.bulkDelete.description',
              'You are about to delete {{count}} tax rates. This action cannot be undone and may affect associated products and price lists.',
              { count: selectedRows.length }
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            disabled={bulkDeleteMutation.isPending}
          >
            {bulkDeleteMutation.isPending
              ? t('common.deleting', 'Deleting...')
              : t('common.delete', 'Delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
