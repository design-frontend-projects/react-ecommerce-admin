import { useState } from 'react'
import { Check, ChevronsUpDown, Package, Layers, AlertCircle, Box } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { type Product } from '@/features/products/data/schema'

export interface VariantOption {
  id: string
  sku: string
  name?: string | null
  attributes_label?: string
  price: number
  cost_price: number | null
  stock_quantity?: number
}

interface POProductVariantPickerProps {
  productId: number
  variantId: string | null
  products: Product[] | undefined
  variantsByProductId: Map<number, VariantOption[]>
  onSelectProduct: (productId: number) => void
  onSelectVariant: (variantId: string, costPrice: number) => void
  showValidation?: boolean
  disabled?: boolean
}

export function POProductVariantPicker({
  productId,
  variantId,
  products = [],
  variantsByProductId,
  onSelectProduct,
  onSelectVariant,
  showValidation,
  disabled,
}: POProductVariantPickerProps) {
  const [productOpen, setProductOpen] = useState(false)

  const selectedProduct = products.find(
    (p) => Number(p.product_id ?? p.id) === productId
  )
  const variants = variantsByProductId.get(productId) ?? []
  const selectedVariant = variants.find((v) => v.id === variantId)

  const handleProductSelect = (selectedId: number) => {
    onSelectProduct(selectedId)
    setProductOpen(false)

    // Auto-select if there's exactly one variant
    const productVariants = variantsByProductId.get(selectedId) ?? []
    if (productVariants.length === 1) {
      onSelectVariant(
        productVariants[0].id,
        Number(productVariants[0].cost_price ?? productVariants[0].price ?? 0)
      )
    }
  }

  return (
    <div className='flex flex-col gap-1.5 w-full'>
      {/* Product Combobox */}
      <Popover open={productOpen} onOpenChange={setProductOpen}>
        <PopoverTrigger asChild>
          <Button
            type='button'
            variant='outline'
            role='combobox'
            aria-expanded={productOpen}
            disabled={disabled}
            className={cn(
              'w-full justify-between font-normal h-9 text-xs sm:text-sm px-2.5',
              !productId && 'text-muted-foreground'
            )}
          >
            <div className='flex items-center gap-2 truncate'>
              <Package className='h-4 w-4 shrink-0 text-muted-foreground' />
              {selectedProduct ? (
                <span className='truncate font-medium text-foreground'>
                  {selectedProduct.name}
                  {selectedProduct.sku && (
                    <span className='ml-1.5 font-mono text-xs text-muted-foreground'>
                      ({selectedProduct.sku})
                    </span>
                  )}
                </span>
              ) : (
                <span>Select product...</span>
              )}
            </div>
            <ChevronsUpDown className='ml-1.5 h-3.5 w-3.5 shrink-0 opacity-50' />
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-[320px] sm:w-[400px] p-0' align='start'>
          <Command>
            <CommandInput placeholder='Search product by name or SKU...' />
            <CommandList className='max-h-60'>
              <CommandEmpty>No product found.</CommandEmpty>
              <CommandGroup>
                {products.map((p) => {
                  const pId = Number(p.product_id ?? p.id)
                  const pVariants = variantsByProductId.get(pId) ?? []
                  const hasNoVariants = pVariants.length === 0
                  const isSelected = productId === pId

                  return (
                    <CommandItem
                      key={pId || p.sku}
                      value={`${p.name} ${p.sku || ''}`}
                      disabled={hasNoVariants}
                      onSelect={() => handleProductSelect(pId)}
                      className='flex items-center justify-between py-2 cursor-pointer'
                    >
                      <div className='flex items-center gap-2 truncate pr-2'>
                        <Check
                          className={cn(
                            'h-4 w-4 shrink-0',
                            isSelected ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        <div className='flex flex-col truncate'>
                          <span className='text-sm font-medium truncate'>
                            {p.name}
                          </span>
                          <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
                            {p.sku && (
                              <span className='font-mono font-normal'>
                                {p.sku}
                              </span>
                            )}
                            {p.categories?.name && (
                              <>
                                <span>•</span>
                                <span>{p.categories.name}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className='shrink-0 text-right'>
                        {hasNoVariants ? (
                          <Badge variant='outline' className='text-[10px] text-destructive border-destructive/30'>
                            No variants
                          </Badge>
                        ) : pVariants.length === 1 ? (
                          <Badge variant='secondary' className='text-[10px]'>
                            1 variant
                          </Badge>
                        ) : (
                          <Badge variant='outline' className='text-[10px] text-primary border-primary/30'>
                            {pVariants.length} variants
                          </Badge>
                        )}
                      </div>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Variant Selection */}
      {productId > 0 && (
        <div className='mt-0.5'>
          {variants.length === 0 ? (
            <div className='flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 p-1.5 rounded'>
              <AlertCircle className='h-3.5 w-3.5 shrink-0' />
              <span>This product has no variants configured and cannot be ordered.</span>
            </div>
          ) : variants.length === 1 ? (
            <div className='flex flex-wrap items-center gap-2 text-xs bg-muted/50 px-2 py-1 rounded border'>
              <div className='flex items-center gap-1 text-muted-foreground'>
                <Layers className='h-3 w-3 shrink-0' />
                <span>Variant:</span>
              </div>
              <span className='font-mono font-medium text-foreground'>
                {variants[0].sku}
              </span>
              {variants[0].attributes_label && (
                <span className='text-muted-foreground'>
                  ({variants[0].attributes_label})
                </span>
              )}
              <span className='text-muted-foreground ml-auto'>
                Default Cost: ${Number(variants[0].cost_price ?? 0).toFixed(2)}
              </span>
            </div>
          ) : (
            <div className='space-y-1'>
              <Select
                value={variantId ?? undefined}
                onValueChange={(val) => {
                  const target = variants.find((v) => v.id === val)
                  if (target) {
                    onSelectVariant(
                      target.id,
                      Number(target.cost_price ?? target.price ?? 0)
                    )
                  }
                }}
                disabled={disabled}
              >
                <SelectTrigger
                  className={cn(
                    'h-8 text-xs w-full bg-background',
                    showValidation && !variantId && 'border-destructive'
                  )}
                >
                  <div className='flex items-center gap-1.5 truncate'>
                    <Layers className='h-3.5 w-3.5 shrink-0 text-muted-foreground' />
                    {selectedVariant ? (
                      <span className='truncate font-medium'>
                        <span className='font-mono'>{selectedVariant.sku}</span>
                        {selectedVariant.name || selectedVariant.attributes_label ? (
                          <span className='text-muted-foreground ml-1'>
                            ({selectedVariant.name || selectedVariant.attributes_label})
                          </span>
                        ) : null}
                      </span>
                    ) : (
                      <SelectValue placeholder='Select product variant...' />
                    )}
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {variants.map((variant) => (
                    <SelectItem
                      key={variant.id}
                      value={variant.id}
                      className='text-xs py-2'
                    >
                      <div className='flex items-center justify-between gap-4 w-full'>
                        <div className='flex items-center gap-2'>
                          <span className='font-mono font-medium'>
                            {variant.sku}
                          </span>
                          {(variant.name || variant.attributes_label) && (
                            <span className='text-muted-foreground'>
                              ({variant.name || variant.attributes_label})
                            </span>
                          )}
                        </div>
                        <div className='flex items-center gap-2 text-[11px] text-muted-foreground ml-auto'>
                          {variant.stock_quantity !== undefined && (
                            <span className='flex items-center gap-0.5'>
                              <Box className='h-3 w-3' />
                              {variant.stock_quantity} in stock
                            </span>
                          )}
                          <span className='font-medium text-foreground'>
                            Cost: ${Number(variant.cost_price ?? 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {showValidation && !variantId && (
                <p className='text-[11px] font-medium text-destructive flex items-center gap-1'>
                  <AlertCircle className='h-3 w-3' />
                  Variant selection is required.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
