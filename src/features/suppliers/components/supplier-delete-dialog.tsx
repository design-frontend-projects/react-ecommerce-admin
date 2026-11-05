import { AlertTriangle, Package, Receipt } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
import { useDeleteSupplier } from '../hooks/use-suppliers'
import { useSuppliersContext } from './suppliers-provider'

export function SupplierDeleteDialog() {
  const { t } = useTranslation()
  const { open, setOpen, currentRow } = useSuppliersContext()
  const deleteMutation = useDeleteSupplier()

  const isOpen = open === 'delete'

  const linkedProducts = currentRow?._count?.products ?? 0
  const linkedOrders = currentRow?._count?.purchase_orders ?? 0
  const hasLinkedDependencies = linkedProducts > 0 || linkedOrders > 0

  const onDelete = async () => {
    if (currentRow && !hasLinkedDependencies) {
      try {
        await deleteMutation.mutateAsync(currentRow.id)
        setOpen(null)
      } catch {
        // error toast handled by mutation hook
      }
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={(v) => !v && setOpen(null)}>
      <AlertDialogContent className='sm:max-w-md'>
        <AlertDialogHeader className='text-start'>
          <AlertDialogTitle className='flex items-center gap-2'>
            <AlertTriangle className='h-5 w-5 text-destructive' />
            <span>
              {t('suppliers.delete.title', { defaultValue: 'Delete Supplier' })}
            </span>
          </AlertDialogTitle>
          <AlertDialogDescription className='text-start'>
            {t('suppliers.delete.warning', {
              defaultValue:
                'This action cannot be undone. This will permanently delete the supplier',
            })}{' '}
            <span className='font-semibold text-foreground'>
              {currentRow?.name ? `"${currentRow.name}"` : ''}
            </span>
            .
          </AlertDialogDescription>
        </AlertDialogHeader>

        {hasLinkedDependencies && (
          <Alert variant='destructive' className='my-2'>
            <AlertTriangle className='h-4 w-4' />
            <AlertTitle className='font-semibold'>
              {t('suppliers.delete.hasDependencies', {
                defaultValue:
                  'Cannot delete supplier: linked purchase orders or products exist.',
              })}
            </AlertTitle>
            <AlertDescription className='mt-2 space-y-2 text-xs'>
              <p>
                {t('suppliers.delete.linkedRecordsWarning', {
                  products: linkedProducts,
                  orders: linkedOrders,
                  defaultValue: `This supplier has ${linkedProducts} linked product(s) and ${linkedOrders} purchase order(s). Deletion is blocked to prevent data inconsistency.`,
                })}
              </p>
              <div className='flex flex-wrap items-center gap-2 pt-1'>
                <Badge
                  variant='outline'
                  className='flex items-center gap-1 border-destructive/40 bg-destructive/10 text-destructive dark:bg-destructive/20'
                >
                  <Package className='h-3 w-3' />
                  <span>
                    {linkedProducts}{' '}
                    {t('suppliers.columns.productsCount', {
                      defaultValue: 'Products',
                    })}
                  </span>
                </Badge>
                <Badge
                  variant='outline'
                  className='flex items-center gap-1 border-destructive/40 bg-destructive/10 text-destructive dark:bg-destructive/20'
                >
                  <Receipt className='h-3 w-3' />
                  <span>
                    {linkedOrders}{' '}
                    {t('suppliers.columns.ordersCount', {
                      defaultValue: 'Orders',
                    })}
                  </span>
                </Badge>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {deleteMutation.isError && (
          <Alert variant='destructive' className='my-2'>
            <AlertTriangle className='h-4 w-4' />
            <AlertTitle className='font-semibold'>
              {t('suppliers.toast.error', {
                defaultValue: 'Failed to delete supplier',
              })}
            </AlertTitle>
            <AlertDescription className='mt-1 text-xs'>
              {deleteMutation.error instanceof Error
                ? deleteMutation.error.message
                : t('suppliers.toast.deleteError', {
                    defaultValue: 'Unable to delete supplier.',
                  })}
            </AlertDescription>
          </Alert>
        )}

        <AlertDialogFooter className='gap-2'>
          <AlertDialogCancel disabled={deleteMutation.isPending}>
            {t('suppliers.delete.cancel', { defaultValue: 'Cancel' })}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              if (!hasLinkedDependencies) {
                onDelete()
              }
            }}
            className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            disabled={deleteMutation.isPending || hasLinkedDependencies}
          >
            {deleteMutation.isPending
              ? t('suppliers.delete.deleting', { defaultValue: 'Deleting...' })
              : t('suppliers.delete.confirm', { defaultValue: 'Delete' })}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
