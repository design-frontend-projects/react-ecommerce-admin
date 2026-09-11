import { useTranslation } from 'react-i18next'
import {
  AlertTriangle,
  Loader2,
  Warehouse,
  Layers,
  Boxes,
  MapPin,
  ShieldAlert,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
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

  const locationCount = currentRow?._count?.warehouse_locations ?? 0
  const stockCount = currentRow?._count?.stock_balances ?? 0
  const hasActiveStock = stockCount > 0

  return (
    <AlertDialog
      open={isOpen}
      onOpenChange={(val) =>
        !deleteWarehouse.isPending && setOpen(val ? 'delete' : null)
      }
    >
      <AlertDialogContent className='sm:max-w-md'>
        <AlertDialogHeader>
          <div className='flex items-center gap-2 text-destructive'>
            <div className='flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10'>
              <AlertTriangle className='h-5 w-5' />
            </div>
            <AlertDialogTitle>
              {t('warehouses.delete.title', 'Delete Warehouse')}
            </AlertDialogTitle>
          </div>

          <AlertDialogDescription className='space-y-3 pt-2 text-start'>
            <p className='text-sm'>
              {t('warehouses.delete.description', {
                name: currentRow?.name,
                code: currentRow?.code,
                defaultValue: `Are you sure you want to delete ${currentRow?.name} (${currentRow?.code})?`,
              })}
            </p>

            {/* Warehouse Summary Card */}
            {currentRow && (
              <div className='rounded-lg border bg-muted/30 p-3 space-y-2 text-xs'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <Warehouse className='h-4 w-4 text-primary' />
                    <span className='font-semibold text-foreground'>
                      {currentRow.name}
                    </span>
                  </div>
                  <Badge variant='outline' className='font-mono font-bold text-[10px]'>
                    {currentRow.code}
                  </Badge>
                </div>

                {(currentRow.countries?.name || currentRow.cities?.name) && (
                  <div className='flex items-center gap-1.5 text-muted-foreground'>
                    <MapPin className='h-3 w-3 shrink-0' />
                    <span>
                      {[currentRow.cities?.name, currentRow.countries?.name]
                        .filter(Boolean)
                        .join(', ')}
                    </span>
                  </div>
                )}

                <div className='grid grid-cols-2 gap-2 pt-1 border-t text-[11px]'>
                  <div className='flex items-center gap-1.5'>
                    <Layers className='h-3.5 w-3.5 text-violet-500' />
                    <span>
                      {locationCount} {t('warehouses.columns.locationsCount', 'Locations')}
                    </span>
                  </div>
                  <div className='flex items-center gap-1.5'>
                    <Boxes className='h-3.5 w-3.5 text-blue-500' />
                    <span>
                      {stockCount} {t('warehouses.columns.stockCount', 'Stock Items')}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Warning if warehouse has stock balances */}
            {hasActiveStock && (
              <div className='flex items-start gap-2 p-2.5 rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs'>
                <ShieldAlert className='h-4 w-4 shrink-0 mt-0.5' />
                <span>
                  {t(
                    'warehouses.delete.stockWarning',
                    'Warning: This warehouse has active stock items recorded. Deletion will be blocked until stock is transferred or cleared.'
                  )}
                </span>
              </div>
            )}
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
