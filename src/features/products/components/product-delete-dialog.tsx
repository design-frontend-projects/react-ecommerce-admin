'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
  const [value, setValue] = useState('')
  const queryClient = useQueryClient()

  const handleDelete = async () => {
    if (value.trim() !== currentRow.name) return

    try {
      const { error } = await supabase
        .from('products')
        .update({ is_deleted: true })
        .eq('product_id', currentRow.product_id)

      if (error) throw error

      toast.success(t('products.toast.deleted'))
      queryClient.invalidateQueries({ queryKey: ['products'] })
      onOpenChange(false)
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error(t('products.toast.error'))
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
          {t('products.delete.title')}
        </span>
      }
      desc={
        <div className='space-y-4'>
          <p>
            {t('products.delete.description')}{' '}
            <span className='font-bold'>{currentRow.name}</span>
          </p>

          <Label>
            {t('products.columns.name')}:
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={currentRow.name}
            />
          </Label>

          <Alert variant='destructive'>
            <AlertTitle>{t('common.confirm')}</AlertTitle>
            <AlertDescription>
              {t('products.delete.description')}
            </AlertDescription>
          </Alert>
        </div>
      }
      confirmText={t('common.delete')}
      cancelBtnText={t('common.cancel')}
      destructive
    />
  )
}

