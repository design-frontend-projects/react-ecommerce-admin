import { useTranslation } from 'react-i18next'
import { AlertTriangle, Loader2 } from 'lucide-react'
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
import { useDeleteWarehouse } from '../hooks/use-warehouses'
import { useWarehousesContext } from './provider'

export function WarehouseDeleteDialog() {
  const { t } = useTranslation()
  const { open, setOpen, currentRow } = useWarehousesContext()
  const deleteWarehouse = useDeleteWarehouse()

  const isOpen = open === 'delete' && !!currentRow

  const handleDelete = async () => {
    if (!currentRow) return
    try {
      await deleteWarehouse.mutateAsync(currentRow.id)
      setOpen(null)
    } catch {
      // Handled by toast
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={(val) => !deleteWarehouse.isPending && setOpen(val ? 'delete' : null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className='flex items-center gap-2 text-destructive'>
            <div className='flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10'>
              <AlertTriangle className='h-5 w-5' />
            </div>
            <AlertDialogTitle>
              {t('warehouses.delete.title', 'Delete Warehouse')}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className='space-y-2 pt-2'>
            <p>
              {t('warehouses.delete.description', {
                name: currentRow?.name,
                code: currentRow?.code,
                defaultValue: `Are you sure you want to delete ${currentRow?.name} (${currentRow?.code})? Warehouses that currently hold stock cannot be deleted.`,
              })}
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteWarehouse.isPending}>
            {t('warehouses.delete.cancel', 'Cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteWarehouse.isPending}
            className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
          >
            {deleteWarehouse.isPending ? (
              <>
                <Loader2 className='me-2 h-4 w-4 animate-spin' />
                {t('warehouses.delete.deleting', 'Deleting...')}
              </>
            ) : (
              t('warehouses.delete.confirm', 'Delete Warehouse')
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
