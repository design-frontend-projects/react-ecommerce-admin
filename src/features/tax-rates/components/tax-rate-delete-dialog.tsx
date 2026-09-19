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
import { useDeleteTaxRate } from '../hooks/use-tax-rates'
import { useTaxContext } from './tax-rates-provider'

export function TaxDeleteDialog() {
  const { t } = useTranslation()
  const { open, setOpen, currentRow } = useTaxContext()
  const deleteMutation = useDeleteTaxRate()

  const onDelete = async () => {
    if (!currentRow) return
    try {
      await deleteMutation.mutateAsync(currentRow.id)
      toast.success(
        t('taxRates.delete.success', {
          defaultValue: 'Tax rate deleted successfully',
        })
      )
      setOpen(null)
    } catch (error: unknown) {
      toast.error(t('common.error', { defaultValue: 'Error' }), {
        description:
          error instanceof Error
            ? error.message
            : t('taxRates.delete.failed', {
                defaultValue: 'Failed to delete tax rate',
              }),
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
          <AlertDialogTitle>
            {t('taxRates.delete.title', { defaultValue: 'Delete Tax Rate?' })}
          </AlertDialogTitle>
          <AlertDialogDescription className='space-y-2'>
            <span>
              {t(
                'taxRates.delete.warning',
                {
                  taxType: currentRow?.tax_type,
                  rate: `${currentRow?.rate}%`,
                  defaultValue: `This will permanently delete ${currentRow?.tax_type} (${currentRow?.rate}%).`,
                }
              )}
            </span>
            <span className='block text-xs text-muted-foreground mt-1'>
              {t(
                'taxRates.delete.dependencyNotice',
                {
                  defaultValue:
                    'Note: If this rate is attached to existing price lists or sales invoices, historic records may lose direct tax mapping.',
                }
              )}
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onDelete}
            className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            disabled={deleteMutation.isPending}
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
