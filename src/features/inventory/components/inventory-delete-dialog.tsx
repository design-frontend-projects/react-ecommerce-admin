'use client'

import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { type Inventory } from '../data/schema'
import { useDeleteInventory } from '../hooks/use-inventory'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow: Inventory
}

export function InventoryDeleteDialog({
  open,
  onOpenChange,
  currentRow,
}: Props) {
  const { t } = useTranslation()
  const deleteMutation = useDeleteInventory()

  const handleDelete = async () => {
    try {
      const targetId = currentRow.id || String(currentRow.inventory_id)
      await deleteMutation.mutateAsync(targetId)
      toast.success(t('inventory.toast.deleted', 'Inventory record deleted successfully'))
      onOpenChange(false)
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error(t('inventory.toast.deleteFailed', 'Failed to delete inventory record'))
      }
    }
  }

  const productName = currentRow.products?.name || t('inventory.unknownProduct', 'this product')
  const variantDetail = currentRow.product_variants
    ? ` (${currentRow.product_variants.name || t('common.default', 'Default')} - ${currentRow.product_variants.sku})`
    : ''

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      handleConfirm={handleDelete}
      disabled={deleteMutation.isPending}
      title={
        <span className='text-destructive'>
          <AlertTriangle
            className='me-1 inline-block stroke-destructive'
            size={18}
          />{' '}
          {t('inventory.delete.title', 'Delete Inventory Record')}
        </span>
      }
      desc={
        <div className='space-y-4'>
          <p>
            {t('inventory.delete.confirmMessage', 'Are you sure you want to delete the inventory record for')}{' '}
            <span className='font-bold'>
              {productName}
              {variantDetail}
            </span>
            ?
            <br />
            {t('inventory.delete.permanentWarning', 'This action will permanently remove this stock tracking entry.')}
          </p>

          <Alert variant='destructive'>
            <AlertTitle>{t('common.warning', 'Warning!')}</AlertTitle>
            <AlertDescription>
              {t('common.cannotBeUndone', 'This operation cannot be undone.')}
            </AlertDescription>
          </Alert>
        </div>
      }
      confirmText={t('common.delete', 'Delete')}
      cancelBtnText={t('common.cancel', 'Cancel')}
      destructive
    />
  )
}

