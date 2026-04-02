import { toast } from 'sonner'
import { Check, ChevronRight } from 'lucide-react'
import { useProductWizardStore } from '../context/product-wizard-store'
import { useCreateProductWithVariants } from '../hooks/use-products'
import { type VariantRowFormData } from '../data/product-wizard-schema'
import { ProductBaseForm } from './product-base-form'
import { ProductVariantsForm } from './product-variants-form'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export function ProductWizardDialog() {
  const { 
    isOpen, 
    setIsOpen, 
    currentStep, 
    prevStep, 
    baseProductData, 
    resetWizard 
  } = useProductWizardStore()
  
  const { mutateAsync: createProduct, isPending } = useCreateProductWithVariants()

  // Reset wizard when unmounting or closing (handled by Dialog onOpenChange)
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      setTimeout(resetWizard, 300) // Delay reset for exit animation
    }
  }

  const handleCreate = async (variantsData: VariantRowFormData[]) => {
    if (!baseProductData) return

    try {
      await createProduct({
        base: {
          name: baseProductData.name,
          description: baseProductData.description,
          sku: String(baseProductData.sku || ''),
          barcode: String(baseProductData.barcode || ''),
          category_id: baseProductData.category_id || null,
          supplier_id: baseProductData.supplier_id || null,
          store_id: baseProductData.store_id || null,
          is_active: Boolean(baseProductData.is_active ?? true),
          has_variants: Boolean(baseProductData.has_variants ?? true),
        },
        variants: variantsData,
      })
      
      toast.success('Product created successfully')
      handleOpenChange(false)
    } catch (error) {
      toast.error(`Failed to create product: ${(error as Error).message || 'Unknown error'}`)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Create New Product</DialogTitle>
          <DialogDescription>
            Step {currentStep} of 2 - {currentStep === 1 ? 'Base Information' : 'Product Variants'}
          </DialogDescription>
        </DialogHeader>

        {/* Optional: Add a visual stepper here */}
        <div className="flex items-center justify-center space-x-2 my-2 text-sm">
          <div className={`flex items-center space-x-2 ${currentStep >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`flex h-6 w-6 items-center justify-center rounded-full border ${currentStep >= 1 ? 'bg-primary border-primary text-primary-foreground' : ''}`}>
              1
            </div>
            <span className="font-medium">Details</span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <div className={`flex items-center space-x-2 ${currentStep >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`flex h-6 w-6 items-center justify-center rounded-full border ${currentStep >= 2 ? 'bg-primary border-primary text-primary-foreground' : ''}`}>
              {currentStep > 2 ? <Check className="h-4 w-4" /> : '2'}
            </div>
            <span className="font-medium">Variants</span>
          </div>
        </div>

        {currentStep === 1 && <ProductBaseForm />}
        {currentStep === 2 && <ProductVariantsForm onSubmit={handleCreate} />}

        <DialogFooter className="flex justify-between sm:justify-between items-center sm:space-x-2">
          <div className="flex w-full justify-between">
            {currentStep === 1 ? (
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
            ) : (
              <Button type="button" variant="outline" onClick={prevStep}>
                Back
              </Button>
            )}
            
            {currentStep === 1 ? (
              <Button type="submit" form="product-base-form">
                Continue to Variants
              </Button>
            ) : (
              <Button type="submit" form="product-variants-form" disabled={isPending}>
                {isPending ? 'Creating...' : 'Create Product'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
