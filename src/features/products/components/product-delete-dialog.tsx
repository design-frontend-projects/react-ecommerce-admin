'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { type Product } from '../data/schema'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow: Product
}

export function ProductDeleteDialog({ open, onOpenChange, currentRow }: Props) {
  const [value, setValue] = useState('')
  const queryClient = useQueryClient()

  const handleDelete = async () => {
    if (value.trim() !== currentRow.name) return

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('product_id', currentRow.product_id)

      if (error) throw error

      toast.success('Product deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['products'] })
      onOpenChange(false)
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error('Failed to delete product')
      }
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      handleConfirm={handleDelete}
      disabled={value.trim() !== currentRow.name}
      title={
        <span className='text-destructive'>
          <AlertTriangle
            className='me-1 inline-block stroke-destructive'
            size={18}
          />{' '}
          Delete Product
        </span>
      }
      desc={
        <div className='space-y-4'>
          <p>
            Are you sure you want to delete{' '}
            <span className='font-bold'>{currentRow.name}</span>?
            <br />
            This action will permanently remove the product from the inventory.
          </p>

          <Label>
            Product Name:
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder='Enter product name to confirm'
            />
          </Label>

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
