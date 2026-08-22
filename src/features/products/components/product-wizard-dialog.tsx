import { Check, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useProductWizardStore } from '../context/product-wizard-store'
import { type VariantRowFormData } from '../data/schema'
import { useCreateProductWithVariants } from '../hooks/use-products'
import { ProductBaseForm } from './product-base-form'
import { ProductVariantsForm } from './product-variants-form'

export function ProductWizardDialog() {
  const { t } = useTranslation()
  const {
    isOpen,
    setIsOpen,
    currentStep,
    prevStep,
    baseProductData,
    resetWizard,
    isVariantsEnabled,
  } = useProductWizardStore()

  const { mutateAsync: createProduct, isPending } =
    useCreateProductWithVariants()

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      setTimeout(resetWizard, 300)
    }
  }

  const handleCreate = async (variantsData: VariantRowFormData[]) => {
    if (!baseProductData) return

    try {
      const expirationIso = baseProductData.expiration_date
        ? typeof baseProductData.expiration_date === 'string'
          ? baseProductData.expiration_date
          : baseProductData.expiration_date.toISOString()
        : null

      await createProduct({
        base: {
          name: baseProductData.name!,
          description: baseProductData.description || null,
          sku: String(baseProductData.sku || ''),
          barcode: baseProductData.barcode || null,
          category_id: baseProductData.category_id || null,
          brand_id: baseProductData.brand_id || null,
          base_uom_id: baseProductData.base_uom_id || null,
          supplier_id: baseProductData.supplier_id || null,
          product_type: baseProductData.product_type || 'simple',
          product_type_id: baseProductData.product_type_id || null,
          tracking_mode: baseProductData.tracking_mode || 'none',
          base_price: baseProductData.base_price ?? 0,
          cost_price: baseProductData.cost_price ?? 0,
          tax_code: baseProductData.tax_code || null,
          tax_classification_id: baseProductData.tax_classification_id || null,
          reorder_level: baseProductData.reorder_level ?? 0,
          weight: baseProductData.weight ?? null,
          dimensions: baseProductData.dimensions || null,
          is_active: Boolean(baseProductData.is_active ?? true),
          is_stock_item: Boolean(baseProductData.is_stock_item ?? true),
          reorderable: Boolean(baseProductData.reorderable ?? true),
          is_batch_tracked: Boolean(baseProductData.is_batch_tracked ?? false),
          is_serial_tracked: Boolean(baseProductData.is_serial_tracked ?? false),
          has_variants: true,
          has_expiration: Boolean(baseProductData.has_expiration ?? false),
          expiration_date: expirationIso,
          is_marketplace: Boolean(baseProductData.is_marketplace ?? false),
        },
        variants: variantsData,
      })

      toast.success(t('products.toast.created'))
      handleOpenChange(false)
    } catch (error) {
      toast.error(
        (error as Error).message || t('products.toast.error')
      )
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className='sm:max-w-[800px]'>
        <DialogHeader>
          <DialogTitle>{t('products.createProduct')}</DialogTitle>
          <DialogDescription>
            {currentStep === 1
              ? t('products.form.basicInfo')
              : t('products.form.variantTitle')}
          </DialogDescription>
        </DialogHeader>

        {/* Visual Stepper */}
        <div className='my-2 flex items-center justify-center space-x-2 text-sm'>
          <div
            className={`flex items-center space-x-2 ${currentStep >= 1 ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs ${currentStep >= 1 ? 'border-primary bg-primary text-primary-foreground' : ''}`}
            >
              1
            </div>
            <span className='font-medium'>{t('products.formTabs.basic')}</span>
          </div>
          <ChevronRight
            className={`h-4 w-4 ${!isVariantsEnabled ? 'text-muted-foreground/30' : 'text-muted-foreground'}`}
          />
          <div
            className={`flex items-center space-x-2 ${currentStep >= 2 ? 'text-primary' : 'text-muted-foreground'} ${!isVariantsEnabled ? 'opacity-40' : ''}`}
          >
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs ${currentStep >= 2 ? 'border-primary bg-primary text-primary-foreground' : ''}`}
            >
              {currentStep > 2 ? <Check className='h-4 w-4' /> : '2'}
            </div>
            <span className='font-medium'>{t('products.formTabs.variants')}</span>
          </div>
        </div>

        {currentStep === 1 && (
          <ProductBaseForm
            onSubmitDirect={async (data) => {
              try {
                const expirationIso = data.expiration_date
                  ? typeof data.expiration_date === 'string'
                    ? data.expiration_date
                    : data.expiration_date.toISOString()
                  : null

                await createProduct({
                  base: {
                    name: data.name,
                    description: data.description || null,
                    sku: String(data.sku || ''),
                    barcode: data.barcode || null,
                    category_id: data.category_id || null,
                    brand_id: data.brand_id || null,
                    base_uom_id: data.base_uom_id || null,
                    supplier_id: data.supplier_id || null,
                    product_type: data.product_type || 'simple',
                    product_type_id: data.product_type_id || null,
                    tracking_mode: data.tracking_mode || 'none',
                    base_price: data.base_price ?? 0,
                    cost_price: data.cost_price ?? 0,
                    tax_code: data.tax_code || null,
                    tax_classification_id: data.tax_classification_id || null,
                    reorder_level: data.reorder_level ?? 0,
                    weight: data.weight ?? null,
                    dimensions: data.dimensions || null,
                    is_active: Boolean(data.is_active ?? true),
                    is_stock_item: Boolean(data.is_stock_item ?? true),
                    reorderable: Boolean(data.reorderable ?? true),
                    is_batch_tracked: Boolean(data.is_batch_tracked ?? false),
                    is_serial_tracked: Boolean(data.is_serial_tracked ?? false),
                    has_variants: false,
                    has_expiration: Boolean(data.has_expiration ?? false),
                    expiration_date: expirationIso,
                    is_marketplace: Boolean(data.is_marketplace ?? false),
                  },
                  variants: [],
                })
                toast.success(t('products.toast.created'))
                handleOpenChange(false)
              } catch (error) {
                toast.error(
                  (error as Error).message || t('products.toast.error')
                )
              }
            }}
          />
        )}
        {currentStep === 2 && <ProductVariantsForm onSubmit={handleCreate} />}

        <DialogFooter className='flex items-center justify-between sm:justify-between sm:space-x-2'>
          <div className='flex w-full justify-between'>
            {currentStep === 1 ? (
              <Button
                type='button'
                variant='outline'
                onClick={() => handleOpenChange(false)}
              >
                {t('products.form.cancel')}
              </Button>
            ) : (
              <Button type='button' variant='outline' onClick={prevStep}>
                Back
              </Button>
            )}

            {currentStep === 1 ? (
              <Button
                type='submit'
                form='product-base-form'
                disabled={isPending}
              >
                {isPending
                  ? t('products.form.saving')
                  : isVariantsEnabled
                    ? 'Continue to Variants'
                    : t('products.form.create')}
              </Button>
            ) : (
              <Button
                type='submit'
                form='product-variants-form'
                disabled={isPending}
              >
                {isPending ? t('products.form.saving') : t('products.form.create')}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
