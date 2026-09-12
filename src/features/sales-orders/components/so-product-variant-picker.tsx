import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Check,
  ChevronsUpDown,
  Package,
  Layers,
  Box,
  Percent,
} from 'lucide-react'
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

export interface SOVariantStockBalance {
  warehouse_id?: string | null
  store_id?: string | null
  qty_on_hand?: number | string
  qty_reserved?: number | string
  qty_available?: number | string | null
}

export interface SOVariantOption {
  id: string
  sku: string
  name?: string | null
  price: number
  cost_price?: number | null
  stock_quantity?: number
  uom_id?: string | null
  stock_balances?: SOVariantStockBalance[]
}

// ─── 1. Searchable Product Dropdown (Combobox) ──────────────────
export interface SOProductSelectProps {
  productId: string | null
  products: Product[] | undefined
  variantsByProductId: Map<string, SOVariantOption[]>
  onSelectProduct: (productId: string) => void
  disabled?: boolean
  showValidation?: boolean
  storeId?: string | null
}

export function SOProductSelect({
  productId,
  products = [],
  variantsByProductId,
  onSelectProduct,
  disabled,
  showValidation,
  storeId,
}: SOProductSelectProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const isStoreMissing = !storeId
  const effectiveDisabled = disabled || isStoreMissing

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
          disabled={effectiveDisabled}
          className={cn(
            'w-full justify-between font-normal h-9 text-xs sm:text-sm px-2.5',
            !productId && 'text-muted-foreground',
            showValidation && !productId && 'border-destructive ring-1 ring-destructive/30',
            isStoreMissing && 'bg-muted/30 opacity-70 cursor-not-allowed'
          )}
        >
          <div className='flex items-center gap-2 truncate'>
            <Package className='h-4 w-4 shrink-0 text-muted-foreground' />
            {isStoreMissing ? (
              <span className='italic text-muted-foreground text-xs'>
                {t('salesOrders.picker.selectStoreFirst', 'Select store first...')}
              </span>
            ) : selectedProduct ? (
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
      <PopoverContent className='w-[340px] sm:w-[420px] p-0' align='start'>
        <Command>
          <CommandInput placeholder={t('salesOrders.picker.searchProduct', 'Search product by name or SKU...')} />
          <CommandList className='max-h-64'>
            <CommandEmpty>{t('salesOrders.picker.noProduct', 'No product found for this store.')}</CommandEmpty>
            <CommandGroup>
              {products.map((p) => {
                const pId = String(p.id ?? p.product_id ?? '')
                const pVariants = variantsByProductId.get(pId) ?? []
                const isSelected = String(productId ?? '') === pId
                const totalStoreStock = pVariants.reduce(
                  (sum, v) => sum + (v.stock_quantity ?? 0),
                  0
                )

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
                          isSelected ? 'opacity-100 text-primary' : 'opacity-0'
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
                          {p.tax_code && (
                            <>
                              <span>•</span>
                              <span className='inline-flex items-center text-[10px] text-primary/80 font-medium'>
                                <Percent className='h-2.5 w-2.5 mr-0.5' />
                                {p.tax_code}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className='shrink-0 flex items-center gap-1.5 text-right'>
                      {/* Store Stock badge */}
                      {totalStoreStock > 0 ? (
                        <Badge
                          variant='outline'
                          className='text-[10px] font-mono text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                        >
                          {totalStoreStock} in stock
                        </Badge>
                      ) : (
                        <Badge
                          variant='outline'
                          className='text-[10px] font-mono text-rose-600 dark:text-rose-400 border-rose-500/30 bg-rose-500/10'
                        >
                          0 in stock
                        </Badge>
                      )}

                      {/* Variant count pill */}
                      <span className='text-[10px] text-muted-foreground'>
                        {pVariants.length === 1
                          ? '1 var.'
                          : `${pVariants.length} vars.`}
                      </span>
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
  currencySymbol?: string
  effectiveWarehouseId?: string | null
  storeId?: string | null
}

export function SOVariantSelect({
  productId,
  variantId,
  variants = [],
  onSelectVariant,
  disabled,
  showValidation,
  currencySymbol = '$',
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
                  <span
                    className={cn(
                      'text-[10px] font-mono px-1 rounded',
                      selectedVariant.stock_quantity > 0
                        ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 font-medium'
                        : 'text-rose-700 dark:text-rose-400 bg-rose-500/10 font-semibold'
                    )}
                  >
                    {selectedVariant.stock_quantity > 0
                      ? `${selectedVariant.stock_quantity} in stock`
                      : '0 in stock'}
                  </span>
                )}
                <span className='font-mono text-xs font-semibold text-foreground'>
                  {currencySymbol}{selectedVariant.price.toFixed(2)}
                </span>
              </div>
            </div>
          ) : (
            t('salesOrders.picker.selectVariant', 'Select variant...')
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className='w-[300px] sm:w-[380px]'>
        {variants.map((v) => {
          const isOutOfStock = (v.stock_quantity ?? 0) <= 0

          return (
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
                  <div className='flex items-center gap-1.5 mt-0.5'>
                    <span
                      className={cn(
                        'text-[11px] font-mono',
                        !isOutOfStock
                          ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                          : 'text-rose-600 dark:text-rose-400 font-semibold'
                      )}
                    >
                      {!isOutOfStock
                        ? `${v.stock_quantity} available in location`
                        : '0 available in location'}
                    </span>
                  </div>
                </div>
                <span className='font-mono text-xs font-bold text-foreground shrink-0'>
                  {currencySymbol}{v.price.toFixed(2)}
                </span>
              </div>
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}
