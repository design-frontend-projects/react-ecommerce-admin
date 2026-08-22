'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { type Product } from '../data/schema'
import { useDeleteProduct } from '../hooks/use-products'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow: Product | null
}

export function ProductDeleteDialog({ open, onOpenChange, currentRow }: Props) {
  const { t } = useTranslation()
  const [value, setValue] = useState('')
  const { mutateAsync: deleteProduct, isPending } = useDeleteProduct()

  if (!currentRow) return null

  const targetId = currentRow.id || (currentRow.product_id ? String(currentRow.product_id) : null)

  const handleDelete = async () => {
    if (!targetId || value.trim() !== currentRow.name) return

    try {
      await deleteProduct(targetId)
      toast.success(t('products.toast.deleted'))
      onOpenChange(false)
      setValue('')
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
      onOpenChange={(v) => {
        onOpenChange(v)
        if (!v) setValue('')
      }}
      handleConfirm={handleDelete}
      disabled={value.trim() !== currentRow.name || isPending}
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
      confirmText={isPending ? t('products.delete.deleting') : t('products.delete.confirm')}
      cancelBtnText={t('products.delete.cancel')}
      destructive
    />
  )
}
