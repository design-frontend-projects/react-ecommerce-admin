'use client'

import { useQueryClient } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { type Inventory } from '../data/schema'

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
  const queryClient = useQueryClient()

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('inventory_id', currentRow.inventory_id)

      if (error) throw error

      toast.success('Inventory item deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      onOpenChange(false)
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error('Failed to delete inventory item')
      }
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      handleConfirm={handleDelete}
      title={
        <span className='text-destructive'>
          <AlertTriangle
            className='me-1 inline-block stroke-destructive'
            size={18}
          />{' '}
          Delete Inventory Item
        </span>
      }
      desc={
        <div className='space-y-4'>
          <p>
            Are you sure you want to delete the inventory for{' '}
            <span className='font-bold'>
              {currentRow.products?.name || 'this product'}
            </span>
            ?
            <br />
            This action will permanently remove this inventory record.
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
