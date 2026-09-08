'use client'

import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
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
  const deleteMutation = useDeleteInventory()

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(currentRow.inventory_id)
      toast.success('Inventory record deleted successfully')
      onOpenChange(false)
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error('Failed to delete inventory record')
      }
    }
  }

  const productName = currentRow.products?.name || 'this product'
  const variantDetail = currentRow.product_variants
    ? ` (${currentRow.product_variants.name || 'Default'} - ${currentRow.product_variants.sku})`
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
          Delete Inventory Record
        </span>
      }
      desc={
        <div className='space-y-4'>
          <p>
            Are you sure you want to delete the inventory record for{' '}
            <span className='font-bold'>
              {productName}
              {variantDetail}
            </span>
            ?
            <br />
            This action will permanently remove this stock tracking entry.
          </p>

          <Alert variant='destructive'>
            <AlertTitle>Warning!</AlertTitle>
            <AlertDescription>
              This operation cannot be undone.
            </AlertDescription>
          </Alert>
        </div>
      }
      confirmText='Delete'
      destructive
    />
  )
}
