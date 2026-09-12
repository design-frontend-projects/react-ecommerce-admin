import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, ChevronsUpDown, Package, Layers, Box } from 'lucide-react'
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
import type { Product } from '@/features/products/data/schema'

export interface SOVariantOption {
  id: string
  sku: string
  name?: string | null
  price: number
  cost_price?: number | null
  stock_quantity?: number
  uom_id?: string | null
}

// ─── 1. Searchable Product Dropdown (Combobox) ──────────────────
export interface SOProductSelectProps {
  productId: string | null
  products: Product[] | undefined
  variantsByProductId: Map<string, SOVariantOption[]>
  onSelectProduct: (productId: string) => void
  disabled?: boolean
  showValidation?: boolean
}

export function SOProductSelect({
  productId,
  products = [],
  variantsByProductId,
  onSelectProduct,
  disabled,
  showValidation,
}: SOProductSelectProps) {
  const { t } = useTranslation()
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
              <span>{t('salesOrders.picker.selectProduct', 'Select product...')}</span>
            )}
          </div>
          <ChevronsUpDown className='ml-1.5 h-3.5 w-3.5 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-[320px] sm:w-[380px] p-0' align='start'>
        <Command>
          <CommandInput placeholder={t('salesOrders.picker.searchProduct', 'Search product by name or SKU...')} />
          <CommandList className='max-h-60'>
            <CommandEmpty>{t('salesOrders.picker.noProduct', 'No product found.')}</CommandEmpty>
            <CommandGroup>
              {products.map((p) => {
                const pId = String(p.id ?? p.product_id ?? '')
                const pVariants = variantsByProductId.get(pId) ?? []
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
                          {t('salesOrders.picker.zeroVariants', '0 variants')}
                        </Badge>
                      ) : pVariants.length === 1 ? (
                        <Badge variant='secondary' className='text-[10px]'>
                          {t('salesOrders.picker.oneVariant', '1 variant')}
                        </Badge>
                      ) : (
                        <Badge variant='outline' className='text-[10px] text-primary border-primary/30'>
                          {t('salesOrders.picker.variantsCount', '{{count}} variants', { count: pVariants.length })}
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
export interface SOVariantSelectProps {
  productId: string | null
  variantId: string | null
  variants: SOVariantOption[]
  onSelectVariant: (variantId: string, price: number, uomId?: string | null) => void
  disabled?: boolean
  showValidation?: boolean
}

export function SOVariantSelect({
  productId,
  variantId,
  variants = [],
  onSelectVariant,
  disabled,
  showValidation,
}: SOVariantSelectProps) {
  const { t } = useTranslation()
  const selectedVariant = variants.find((v) => v.id === variantId)
  const hasNoProduct = !productId
  const hasNoVariants = !hasNoProduct && variants.length === 0

  if (hasNoProduct) {
    return (
      <Select disabled>
        <SelectTrigger className='h-9 text-xs w-full bg-muted/30 text-muted-foreground cursor-not-allowed'>
          <div className='flex items-center gap-1.5 truncate'>
            <Layers className='h-3.5 w-3.5 shrink-0 text-muted-foreground' />
            <span>{t('salesOrders.picker.selectProductFirst', 'Select product first')}</span>
          </div>
        </SelectTrigger>
      </Select>
    )
  }

  if (hasNoVariants) {
    return (
      <div className='h-9 px-3 rounded-md border border-amber-300/60 bg-amber-500/10 text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1.5'>
        <Box className='h-3.5 w-3.5 shrink-0' />
        <span className='truncate'>{t('salesOrders.picker.noVariants', 'No variants found')}</span>
      </div>
    )
  }

  return (
    <Select
      value={variantId || ''}
      onValueChange={(val) => {
        const picked = variants.find((v) => v.id === val)
        if (picked) {
          onSelectVariant(picked.id, picked.price, picked.uom_id)
        }
      }}
      disabled={disabled}
    >
      <SelectTrigger
        className={cn(
          'h-9 text-xs sm:text-sm w-full font-normal',
          !variantId && 'text-muted-foreground',
          showValidation && !variantId && 'border-destructive ring-1 ring-destructive/30'
        )}
      >
        <SelectValue placeholder={t('salesOrders.picker.selectVariant', 'Select variant...')}>
          {selectedVariant ? (
            <div className='flex items-center justify-between w-full gap-2 pr-1'>
              <div className='flex items-center gap-1.5 truncate'>
                <Layers className='h-3.5 w-3.5 shrink-0 text-primary' />
                <span className='font-mono font-medium truncate'>
                  {selectedVariant.sku}
                </span>
                {selectedVariant.name && (
                  <span className='text-xs text-muted-foreground truncate'>
                    ({selectedVariant.name})
                  </span>
                )}
              </div>
              <div className='flex items-center gap-1.5 shrink-0'>
                {selectedVariant.stock_quantity !== undefined && (
                  <span className='text-[11px] text-muted-foreground'>
                    {t('salesOrders.picker.stockCount', 'Stock: {{count}}', { count: selectedVariant.stock_quantity })}
                  </span>
                )}
                <span className='font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400'>
                  ${selectedVariant.price.toFixed(2)}
                </span>
              </div>
            </div>
          ) : (
            t('salesOrders.picker.selectVariant', 'Select variant...')
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className='w-[280px] sm:w-[340px]'>
        {variants.map((v) => (
          <SelectItem key={v.id} value={v.id} className='cursor-pointer py-2'>
            <div className='flex items-center justify-between w-full gap-3'>
              <div className='flex flex-col truncate'>
                <div className='flex items-center gap-1.5'>
                  <span className='font-mono font-medium text-xs sm:text-sm'>
                    {v.sku}
                  </span>
                  {v.name && (
                    <span className='text-xs text-muted-foreground truncate'>
                      ({v.name})
                    </span>
                  )}
                </div>
                {v.stock_quantity !== undefined && (
                  <span className='text-[11px] text-muted-foreground'>
                    {t('salesOrders.picker.inStockCount', 'In stock: {{count}} units', { count: v.stock_quantity })}
                  </span>
                )}
              </div>
              <span className='font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 shrink-0'>
                ${v.price.toFixed(2)}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
