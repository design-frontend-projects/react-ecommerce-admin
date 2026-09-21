import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useSupplierOptions } from '@/hooks/use-inventory-lookups'
import { useUpdateBatch } from '../hooks/use-batches'
import {
  updateBatchSchema,
  type BatchListItem,
  type UpdateBatchInput,
} from '../data/schema'

interface BatchEditDialogProps {
  batch: BatchListItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BatchEditDialog({
  batch,
  open,
  onOpenChange,
}: BatchEditDialogProps) {
  const { t } = useTranslation()
  const updateBatch = useUpdateBatch()
  const { data: suppliers = [], isLoading: isLoadingSuppliers } = useSupplierOptions()

  const form = useForm<UpdateBatchInput>({
    resolver: zodResolver(updateBatchSchema),
    defaultValues: {
      batch_number: '',
      manufacture_date: '',
      expiry_date: '',
      unit_cost: 0,
      supplier_id: '',
      notes: '',
      status: 'active',
    },
  })

  useEffect(() => {
    if (batch && open) {
      form.reset({
        batch_number: batch.batch_number,
        manufacture_date: batch.manufacture_date || '',
        expiry_date: batch.expiry_date || '',
        unit_cost: batch.unit_cost,
        supplier_id: batch.supplier_id || '',
        notes: batch.notes || '',
        status: batch.status,
      })
    }
  }, [batch, open, form])

  if (!batch) return null

  const onSubmit = (data: UpdateBatchInput) => {
    updateBatch.mutate(
      {
        id: batch.id,
        input: {
          ...data,
          manufacture_date: data.manufacture_date || null,
          expiry_date: data.expiry_date || null,
          supplier_id: data.supplier_id || null,
          notes: data.notes || null,
        },
      },
      {
        onSuccess: () => {
          onOpenChange(false)
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[550px] max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>{t('batches.form.editTitle', 'Edit Batch Details')}</DialogTitle>
          <DialogDescription>
            {t(
              'batches.form.editDescription',
              'Update lot attributes, expiration date, unit cost, or supplier notes.'
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4 py-2'>
          {/* Read-only product info */}
          <div className='rounded-md border bg-muted/40 p-3'>
            <div className='text-xs text-muted-foreground'>
              {t('batches.form.product', 'Product Variant')}
            </div>
            <div className='font-semibold text-sm mt-0.5'>
              {batch.product_variants?.sku}{' '}
              {batch.product_variants?.products?.name
                ? `— ${batch.product_variants.products.name}`
                : ''}
            </div>
            {batch.product_variants?.barcode ? (
              <div className='text-xs text-muted-foreground mt-1'>
                {t('batches.details.barcode', 'Barcode')}: {batch.product_variants.barcode}
              </div>
            ) : null}
          </div>

          {/* Batch Number */}
          <div className='space-y-1.5'>
            <Label htmlFor='edit_batch_number'>
              {t('batches.form.batchNumber', 'Batch / Lot Number')}
            </Label>
            <Input
              id='edit_batch_number'
              {...form.register('batch_number')}
            />
            {form.formState.errors.batch_number && (
              <p className='text-xs text-rose-500'>
                {form.formState.errors.batch_number.message}
              </p>
            )}
          </div>

          {/* Supplier */}
          <div className='space-y-1.5'>
            <Label htmlFor='edit_supplier_id'>
              {t('batches.form.supplier', 'Supplier (Optional)')}
            </Label>
            <Select
              value={form.watch('supplier_id') || 'none'}
              onValueChange={(val) =>
                form.setValue('supplier_id', val === 'none' ? '' : val)
              }
            >
              <SelectTrigger id='edit_supplier_id'>
                <SelectValue
                  placeholder={
                    isLoadingSuppliers
                      ? 'Loading suppliers...'
                      : t('batches.form.selectSupplier', 'Select supplier')
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='none'>
                  {t('batches.form.noSupplier', 'No supplier assigned')}
                </SelectItem>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name} {supplier.code ? `(${supplier.code})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dates */}
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            <div className='space-y-1.5'>
              <Label htmlFor='edit_mfg_date'>
                {t('batches.form.mfgDate', 'Manufacturing Date')}
              </Label>
              <Input
                id='edit_mfg_date'
                type='date'
                {...form.register('manufacture_date')}
              />
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='edit_expiry_date'>
                {t('batches.form.expiryDate', 'Expiry Date')}
              </Label>
              <Input
                id='edit_expiry_date'
                type='date'
                {...form.register('expiry_date')}
              />
            </div>
          </div>

          {/* Unit Cost & Status */}
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            <div className='space-y-1.5'>
              <Label htmlFor='edit_unit_cost'>
                {t('batches.form.unitCost', 'Unit Cost')}
              </Label>
              <Input
                id='edit_unit_cost'
                type='number'
                step='0.0001'
                min='0'
                {...form.register('unit_cost', { valueAsNumber: true })}
              />
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='edit_status'>
                {t('batches.form.status', 'Status')}
              </Label>
              <Select
                value={form.watch('status')}
                onValueChange={(
                  val: 'active' | 'blocked' | 'expired' | 'depleted'
                ) => form.setValue('status', val)}
              >
                <SelectTrigger id='edit_status'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='active'>
                    {t('batches.status.active', 'Active')}
                  </SelectItem>
                  <SelectItem value='blocked'>
                    {t('batches.status.blocked', 'Blocked')}
                  </SelectItem>
                  <SelectItem value='expired'>
                    {t('batches.status.expired', 'Expired')}
                  </SelectItem>
                  <SelectItem value='depleted'>
                    {t('batches.status.depleted', 'Depleted')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className='space-y-1.5'>
            <Label htmlFor='edit_notes'>
              {t('batches.form.notes', 'Notes / Inspection Remarks')}
            </Label>
            <Textarea
              id='edit_notes'
              rows={2}
              {...form.register('notes')}
            />
          </div>

          <DialogFooter className='pt-2'>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
            >
              {t('batches.form.cancel', 'Cancel')}
            </Button>
            <Button type='submit' disabled={updateBatch.isPending}>
              {updateBatch.isPending ? (
                <>
                  <Loader2 className='me-2 h-4 w-4 animate-spin' />
                  {t('batches.form.updating', 'Updating...')}
                </>
              ) : (
                t('batches.form.update', 'Update Batch')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
