import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Sparkles, Loader2 } from 'lucide-react'
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
import {
  useSupplierOptions,
  useVariantOptions,
} from '@/hooks/use-inventory-lookups'
import { useCreateBatch } from '../hooks/use-batches'
import { createBatchSchema, type CreateBatchInput } from '../data/schema'

interface BatchCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BatchCreateDialog({
  open,
  onOpenChange,
}: BatchCreateDialogProps) {
  const { t } = useTranslation()
  const createBatch = useCreateBatch()
  const { data: variants = [], isLoading: isLoadingVariants } = useVariantOptions()
  const { data: suppliers = [], isLoading: isLoadingSuppliers } = useSupplierOptions()
  const [variantSearch, setVariantSearch] = useState('')

  const form = useForm<CreateBatchInput>({
    resolver: zodResolver(createBatchSchema),
    defaultValues: {
      product_variant_id: '',
      batch_number: '',
      manufacture_date: '',
      expiry_date: '',
      unit_cost: 0,
      supplier_id: '',
      notes: '',
      status: 'active',
    },
  })

  const generateBatchNumber = () => {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const rand = Math.floor(1000 + Math.random() * 9000)
    const generated = `LOT-${today}-${rand}`
    form.setValue('batch_number', generated, { shouldValidate: true })
  }

  const onSubmit = (data: CreateBatchInput) => {
    createBatch.mutate(
      {
        ...data,
        manufacture_date: data.manufacture_date || null,
        expiry_date: data.expiry_date || null,
        supplier_id: data.supplier_id || null,
        notes: data.notes || null,
      },
      {
        onSuccess: () => {
          form.reset()
          onOpenChange(false)
        },
      }
    )
  }

  const filteredVariants = variants.filter(
    (v) =>
      v.sku.toLowerCase().includes(variantSearch.toLowerCase()) ||
      v.products?.name?.toLowerCase().includes(variantSearch.toLowerCase())
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[550px] max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>{t('batches.form.createTitle', 'Register New Batch')}</DialogTitle>
          <DialogDescription>
            {t(
              'batches.form.createDescription',
              'Create a new lot tracking record with expiry and cost details.'
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4 py-2'>
          {/* Product Variant */}
          <div className='space-y-1.5'>
            <Label htmlFor='product_variant_id'>
              {t('batches.form.product', 'Product Variant')}{' '}
              <span className='text-rose-500'>*</span>
            </Label>
            <Select
              value={form.watch('product_variant_id')}
              onValueChange={(val) =>
                form.setValue('product_variant_id', val, { shouldValidate: true })
              }
            >
              <SelectTrigger id='product_variant_id'>
                <SelectValue
                  placeholder={
                    isLoadingVariants
                      ? 'Loading variants...'
                      : t('batches.form.selectProduct', 'Select product variant')
                  }
                />
              </SelectTrigger>
              <SelectContent className='max-h-60'>
                <div className='p-2'>
                  <Input
                    placeholder={t('batches.form.searchProduct', 'Search SKU or name...')}
                    value={variantSearch}
                    onChange={(e) => setVariantSearch(e.target.value)}
                    className='h-8 text-xs'
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                </div>
                {filteredVariants.map((variant) => (
                  <SelectItem key={variant.id} value={variant.id}>
                    <span className='font-medium'>{variant.sku}</span>
                    {variant.products?.name ? (
                      <span className='text-muted-foreground ms-1'>
                        — {variant.products.name}
                      </span>
                    ) : null}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.product_variant_id && (
              <p className='text-xs text-rose-500'>
                {form.formState.errors.product_variant_id.message}
              </p>
            )}
          </div>

          {/* Batch Number */}
          <div className='space-y-1.5'>
            <div className='flex items-center justify-between'>
              <Label htmlFor='batch_number'>
                {t('batches.form.batchNumber', 'Batch / Lot Number')}{' '}
                <span className='text-rose-500'>*</span>
              </Label>
              <Button
                type='button'
                variant='ghost'
                size='sm'
                onClick={generateBatchNumber}
                className='h-7 text-xs text-primary gap-1 px-2'
              >
                <Sparkles className='h-3 w-3' />
                {t('batches.form.autoGenerate', 'Auto Generate')}
              </Button>
            </div>
            <Input
              id='batch_number'
              placeholder={t('batches.form.batchNumberPlaceholder', 'e.g. LOT-2026-001')}
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
            <Label htmlFor='supplier_id'>
              {t('batches.form.supplier', 'Supplier (Optional)')}
            </Label>
            <Select
              value={form.watch('supplier_id') || 'none'}
              onValueChange={(val) =>
                form.setValue('supplier_id', val === 'none' ? '' : val)
              }
            >
              <SelectTrigger id='supplier_id'>
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

          {/* Dates (Manufacture & Expiry) */}
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            <div className='space-y-1.5'>
              <Label htmlFor='manufacture_date'>
                {t('batches.form.mfgDate', 'Manufacturing Date')}
              </Label>
              <Input
                id='manufacture_date'
                type='date'
                {...form.register('manufacture_date')}
              />
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='expiry_date'>
                {t('batches.form.expiryDate', 'Expiry Date')}
              </Label>
              <Input
                id='expiry_date'
                type='date'
                {...form.register('expiry_date')}
              />
            </div>
          </div>

          {/* Unit Cost & Initial Status */}
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            <div className='space-y-1.5'>
              <Label htmlFor='unit_cost'>
                {t('batches.form.unitCost', 'Unit Cost')}
              </Label>
              <Input
                id='unit_cost'
                type='number'
                step='0.0001'
                min='0'
                placeholder='0.00'
                {...form.register('unit_cost', { valueAsNumber: true })}
              />
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='status'>
                {t('batches.form.status', 'Status')}
              </Label>
              <Select
                value={form.watch('status')}
                onValueChange={(val: 'active' | 'blocked') =>
                  form.setValue('status', val)
                }
              >
                <SelectTrigger id='status'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='active'>
                    {t('batches.status.active', 'Active')}
                  </SelectItem>
                  <SelectItem value='blocked'>
                    {t('batches.status.blocked', 'Blocked')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className='space-y-1.5'>
            <Label htmlFor='notes'>
              {t('batches.form.notes', 'Notes / Inspection Remarks')}
            </Label>
            <Textarea
              id='notes'
              rows={2}
              placeholder={t(
                'batches.form.notesPlaceholder',
                'Optional lot tracking notes, quality certificates, storage instructions...'
              )}
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
            <Button type='submit' disabled={createBatch.isPending}>
              {createBatch.isPending ? (
                <>
                  <Loader2 className='me-2 h-4 w-4 animate-spin' />
                  {t('batches.form.saving', 'Saving...')}
                </>
              ) : (
                t('batches.form.save', 'Save Batch')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
