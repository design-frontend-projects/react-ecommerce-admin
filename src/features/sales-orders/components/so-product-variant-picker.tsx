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
  qty_on_hand?: number
  qty_reserved?: number
  qty_available?: number
  uom_id?: string | null
  tax_rate_id?: string | null
  tax_rates?: { id?: string; tax_type?: string; rate?: number | string; is_inclusive?: boolean } | null
  stock_balances?: SOVariantStockBalance[]
  priceListName?: string | null
  priceSource?: string | null
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
  effectiveWarehouseId?: string | null
  effectiveWarehouseName?: string | null
}

export function SOProductSelect({
  productId,
  products = [],
  variantsByProductId,
  onSelectProduct,
  disabled,
  showValidation,
  storeId,
  effectiveWarehouseName,
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
              <span className='truncate font-medium text-foreground flex items-center gap-1.5'>
                <span className='truncate'>{selectedProduct.name}</span>
                {selectedProduct.sku && (
                  <span className='font-mono text-xs text-muted-foreground shrink-0'>
                    ({selectedProduct.sku})
                  </span>
                )}
                {selectedProduct.tax_code && (
                  <Badge variant='outline' className='text-[9px] h-4 px-1 text-primary border-primary/20 bg-primary/5 shrink-0'>
                    <Percent className='h-2 w-2 mr-0.5' /> {selectedProduct.tax_code}
                  </Badge>
                )}
              </span>
            ) : (
              <span>{t('salesOrders.picker.selectProduct', 'Select product...')}</span>
            )}
          </div>
          <ChevronsUpDown className='ml-1.5 h-3.5 w-3.5 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-[340px] sm:w-[440px] p-0 shadow-lg' align='start'>
        <Command>
          <CommandInput placeholder={t('salesOrders.picker.searchProduct', 'Search product by name or SKU...')} />
          <CommandList className='max-h-64'>
            <CommandEmpty>{t('salesOrders.picker.noProduct', 'No product found for this store.')}</CommandEmpty>
            <CommandGroup>
              {products.map((p) => {
                const pId = String(p.id ?? p.product_id ?? '')
                const pVariants = variantsByProductId.get(pId) ?? []
                const isSelected = String(productId ?? '') === pId
                const totalAvailable = pVariants.reduce(
                  (sum, v) => sum + Number(v.qty_available ?? v.stock_quantity ?? 0),
                  0
                )
                const totalOnHand = pVariants.reduce(
                  (sum, v) => sum + Number(v.qty_on_hand ?? v.stock_quantity ?? 0),
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
                              <span className='truncate'>{p.categories.name}</span>
                            </>
                          )}
                          {p.tax_code && (
                            <>
                              <span>•</span>
                              <span className='inline-flex items-center text-[10px] text-primary/90 font-medium'>
                                <Percent className='h-2.5 w-2.5 mr-0.5' />
                                {p.tax_code}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className='shrink-0 flex flex-col items-end gap-0.5 text-right'>
                      <div className='flex items-center gap-1.5'>
                        {/* Warehouse Stock badge */}
                        {totalAvailable > 5 ? (
                          <Badge
                            variant='outline'
                            className='text-[10px] font-mono text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                          >
                            {totalAvailable} avail.
                          </Badge>
                        ) : totalAvailable > 0 ? (
                          <Badge
                            variant='outline'
                            className='text-[10px] font-mono text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10'
                          >
                            {totalAvailable} avail.
                          </Badge>
                        ) : (
                          <Badge
                            variant='outline'
                            className='text-[10px] font-mono text-rose-600 dark:text-rose-400 border-rose-500/30 bg-rose-500/10'
                          >
                            0 avail.
                          </Badge>
                        )}

                        {/* Variant count pill */}
                        <span className='text-[10px] text-muted-foreground'>
                          {pVariants.length === 1
                            ? '1 var.'
                            : `${pVariants.length} vars.`}
                        </span>
                      </div>
                      <span className='text-[9px] font-mono text-muted-foreground'>
                        {totalOnHand} on hand
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
  effectiveWarehouseName?: string | null
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
  effectiveWarehouseName,
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

  const selAvail = selectedVariant?.qty_available ?? selectedVariant?.stock_quantity ?? 0
  const selOnHand = selectedVariant?.qty_on_hand ?? selectedVariant?.stock_quantity ?? 0

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
                {selectedVariant.tax_rates && (
                  <Badge variant='outline' className='text-[9px] h-4 px-1 text-primary border-primary/20 bg-primary/5 shrink-0 hidden sm:inline-flex'>
                    <Percent className='h-2 w-2 mr-0.5' /> {selectedVariant.tax_rates.tax_type} ({selectedVariant.tax_rates.rate}%)
                  </Badge>
                )}
              </div>
              <div className='flex items-center gap-1.5 shrink-0'>
                <span
                  className={cn(
                    'text-[10px] font-mono px-1.5 py-0.5 rounded',
                    selAvail > 5
                      ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 font-medium'
                      : selAvail > 0
                      ? 'text-amber-700 dark:text-amber-400 bg-amber-500/10 font-medium'
                      : 'text-rose-700 dark:text-rose-400 bg-rose-500/10 font-semibold'
                  )}
                >
                  {selAvail > 0 ? `${selAvail} avail.` : '0 avail.'}
                  {selectedVariant.qty_on_hand !== undefined && (
                    <span className='ml-1 opacity-75 font-normal'>
                      ({selOnHand} on hand)
                    </span>
                  )}
                </span>
                <div className='flex items-center gap-1 shrink-0'>
                  <span className='font-mono text-xs font-semibold text-foreground'>
                    {currencySymbol}{selectedVariant.price.toFixed(2)}
                  </span>
                  {selectedVariant.priceListName && (
                    <span
                      className='text-[9px] font-medium text-emerald-600 dark:text-emerald-400 hidden sm:inline truncate max-w-[100px]'
                      title={selectedVariant.priceListName}
                    >
                      ({selectedVariant.priceListName})
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            t('salesOrders.picker.selectVariant', 'Select variant...')
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className='w-[320px] sm:w-[420px]'>
        {variants.map((v) => {
          const avail = v.qty_available ?? v.stock_quantity ?? 0
          const onHand = v.qty_on_hand ?? v.stock_quantity ?? 0
          const reserved = v.qty_reserved ?? 0
          const isOutOfStock = avail <= 0
          const isLowStock = avail > 0 && avail <= 5

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
                  <div className='flex items-center gap-1.5 mt-0.5 text-[11px] font-mono'>
                    <span
                      className={cn(
                        !isOutOfStock && !isLowStock
                          ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                          : isLowStock
                          ? 'text-amber-600 dark:text-amber-400 font-medium'
                          : 'text-rose-600 dark:text-rose-400 font-semibold'
                      )}
                    >
                      {avail} avail.
                    </span>
                    <span className='text-muted-foreground'>•</span>
                    <span className='text-muted-foreground'>
                      {onHand} on hand
                    </span>
                    {reserved > 0 && (
                      <>
                        <span className='text-muted-foreground'>•</span>
                        <span className='text-amber-600 dark:text-amber-400'>
                          {reserved} res.
                        </span>
                      </>
                    )}
                    {effectiveWarehouseName && (
                      <>
                        <span className='text-muted-foreground'>•</span>
                        <span className='text-muted-foreground/80 truncate max-w-[100px]'>
                          {effectiveWarehouseName}
                        </span>
                      </>
                    )}
                    {v.tax_rates && (
                      <>
                        <span className='text-muted-foreground'>•</span>
                        <span className='text-primary/90 font-medium'>
                          {v.tax_rates.tax_type} ({v.tax_rates.rate}%)
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className='flex flex-col items-end shrink-0'>
                  <span className='font-mono text-xs font-bold text-foreground'>
                    {currencySymbol}{v.price.toFixed(2)}
                  </span>
                  {v.priceListName && (
                    <span
                      className='text-[9px] font-medium text-emerald-600 dark:text-emerald-400 max-w-[110px] truncate'
                      title={v.priceListName}
                    >
                      {v.priceListName}
                    </span>
                  )}
                </div>
              </div>
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}
