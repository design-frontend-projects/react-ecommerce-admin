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

// ─── 1. Separate Product Dropdown (Combobox) ──────────────────
export interface POProductSelectProps {
  productId: string | number | null
  products: Product[] | undefined
  variantsByProductId: Map<string, VariantOption[]> | Map<number, VariantOption[]>
  onSelectProduct: (productId: string) => void
  disabled?: boolean
  showValidation?: boolean
}

export function POProductSelect({
  productId,
  products = [],
  variantsByProductId,
  onSelectProduct,
  disabled,
  showValidation,
}: POProductSelectProps) {
  const [open, setOpen] = useState(false)

  const selectedProduct = products.find((p) => {
    const pId = String(p.id ?? p.product_id ?? '')
    return pId === String(productId ?? '')
  })

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type='button'
          variant='outline'
          role='combobox'
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between font-normal h-9 text-xs sm:text-sm px-2.5',
            !productId && 'text-muted-foreground',
            showValidation && !productId && 'border-destructive ring-1 ring-destructive/30'
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
      <PopoverContent className='w-[320px] sm:w-[380px] p-0' align='start'>
        <Command>
          <CommandInput placeholder='Search product by name or SKU...' />
          <CommandList className='max-h-60'>
            <CommandEmpty>No product found.</CommandEmpty>
            <CommandGroup>
              {products.map((p) => {
                const pId = String(p.id ?? p.product_id ?? '')
                const pVariants =
                  (variantsByProductId as Map<string, VariantOption[]>).get(pId) ??
                  (variantsByProductId as Map<number, VariantOption[]>).get(Number(pId)) ??
                  []
                const isSelected = String(productId ?? '') === pId

                return (
                  <CommandItem
                    key={pId || p.sku}
                    value={`${p.name} ${p.sku || ''} ${pId}`}
                    onSelect={() => {
                      onSelectProduct(pId)
                      setOpen(false)
                    }}
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
                      {pVariants.length === 0 ? (
                        <Badge variant='outline' className='text-[10px] text-muted-foreground'>
                          0 variants
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
  )
}

// ─── 2. Separate Variant Dropdown ─────────────────────────────
export interface POVariantSelectProps {
  productId: string | number | null
  variantId: string | null
  variants: VariantOption[]
  onSelectVariant: (variantId: string, costPrice: number) => void
  disabled?: boolean
  showValidation?: boolean
}

export function POVariantSelect({
  productId,
  variantId,
  variants = [],
  onSelectVariant,
  disabled,
  showValidation,
}: POVariantSelectProps) {
  const selectedVariant = variants.find((v) => v.id === variantId)
  const hasNoProduct = !productId || productId === '0' || productId === 0
  const hasNoVariants = !hasNoProduct && variants.length === 0

  if (hasNoProduct) {
    return (
      <Select disabled>
        <SelectTrigger className='h-9 text-xs w-full bg-muted/30 text-muted-foreground cursor-not-allowed'>
          <div className='flex items-center gap-1.5 truncate'>
            <Layers className='h-3.5 w-3.5 shrink-0 text-muted-foreground' />
            <span>Select product first</span>
          </div>
        </SelectTrigger>
      </Select>
    )
  }

  if (hasNoVariants) {
    return (
      <div className='flex items-center gap-1 text-xs text-destructive bg-destructive/10 px-2 py-1.5 rounded h-9 border border-destructive/20'>
        <AlertCircle className='h-3.5 w-3.5 shrink-0' />
        <span className='truncate text-[11px] font-medium'>No variants configured</span>
      </div>
    )
  }

  return (
    <Select
      value={variantId ?? ''}
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
          'h-9 text-xs w-full bg-background',
          showValidation && !variantId && 'border-destructive ring-1 ring-destructive/30'
        )}
      >
        <div className='flex items-center gap-1.5 truncate'>
          <Layers className='h-3.5 w-3.5 shrink-0 text-muted-foreground' />
          {selectedVariant ? (
            <span className='truncate font-medium'>
              <span className='font-mono'>{selectedVariant.sku}</span>
              {(selectedVariant.name || selectedVariant.attributes_label) && (
                <span className='text-muted-foreground ml-1'>
                  ({selectedVariant.name || selectedVariant.attributes_label})
                </span>
              )}
            </span>
          ) : (
            <SelectValue placeholder='Select variant...' />
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
            <div className='flex items-center justify-between gap-3 w-full'>
              <div className='flex items-center gap-2'>
                <span className='font-mono font-medium'>{variant.sku}</span>
                {(variant.name || variant.attributes_label) && (
                  <span className='text-muted-foreground text-xs'>
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
                <span className='font-medium text-foreground font-mono'>
                  Cost: ${Number(variant.cost_price ?? variant.price ?? 0).toFixed(2)}
                </span>
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// ─── 3. Legacy / Combined Component (For Backward Compatibility) ───
export interface POProductVariantPickerProps {
  productId: string | number
  variantId: string | null
  products: Product[] | undefined
  variantsByProductId: Map<string, VariantOption[]> | Map<number, VariantOption[]>
  onSelectProduct: (productId: string | number) => void
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
  const pIdStr = productId ? String(productId) : ''

  const variants =
    (variantsByProductId as Map<string, VariantOption[]>).get(pIdStr) ??
    (variantsByProductId as Map<number, VariantOption[]>).get(Number(productId)) ??
    (productId ? (variantsByProductId as Map<string | number, VariantOption[]>).get(productId) : undefined) ??
    []

  return (
    <div className='flex flex-col gap-1.5 w-full'>
      <POProductSelect
        productId={productId}
        products={products}
        variantsByProductId={variantsByProductId}
        onSelectProduct={(pId) => {
          onSelectProduct(pId)
          const pVariants =
            (variantsByProductId as Map<string, VariantOption[]>).get(pId) ??
            (variantsByProductId as Map<number, VariantOption[]>).get(Number(pId)) ??
            []
          if (pVariants.length === 1) {
            onSelectVariant(
              pVariants[0].id,
              Number(pVariants[0].cost_price ?? pVariants[0].price ?? 0)
            )
          }
        }}
        disabled={disabled}
        showValidation={showValidation}
      />

      {productId && variants.length === 1 ? (
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
            Default Cost: ${Number(variants[0].cost_price ?? variants[0].price ?? 0).toFixed(2)}
          </span>
        </div>
      ) : productId ? (
        <POVariantSelect
          productId={productId}
          variantId={variantId}
          variants={variants}
          onSelectVariant={onSelectVariant}
          disabled={disabled}
          showValidation={showValidation}
        />
      ) : null}
    </div>
  )
}
